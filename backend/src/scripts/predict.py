import sys
import json
import numpy as np
import os
import h5py

# Sembunyikan warning dari tensorflow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    import tensorflow as tf
except ImportError:
    print(json.dumps({"success": False, "error": "Modul TensorFlow tidak ditemukan. Silakan jalankan 'pip install tensorflow' di server."}))
    sys.exit(1)

def fix_h5_quantization(model_path):
    """
    Menghapus 'quantization_config' dari file .h5 (Keras 3 -> Keras 2 compatibility)
    """
    try:
        with h5py.File(model_path, 'r+') as f:
            if 'model_config' in f.attrs:
                model_config_str = f.attrs['model_config']
                if isinstance(model_config_str, bytes):
                    model_config_str = model_config_str.decode('utf-8')
                
                model_config = json.loads(model_config_str)
                modified = False
                
                def remove_quant(obj):
                    nonlocal modified
                    if isinstance(obj, dict):
                        if 'quantization_config' in obj:
                            del obj['quantization_config']
                            modified = True
                        for k, v in obj.items():
                            remove_quant(v)
                    elif isinstance(obj, list):
                        for v in obj:
                            remove_quant(v)
                
                remove_quant(model_config)
                if modified:
                    f.attrs['model_config'] = json.dumps(model_config).encode('utf-8')
    except Exception:
        pass 

def main():
    try:
        # 1. Baca input dari stdin (dikirim oleh Node.js)
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "Tidak ada data input yang diberikan ke stdin."}))
            return

        data = json.loads(input_data)
        
        # Ambil parameter dari JSON Node.js
        scaled_input = data.get('input', [])     # Ekspektasi: Array 2D berukuran (10, 7)
        horizon = data.get('horizon', 1)         # Berapa langkah ke depan yang mau diprediksi
        time_step = data.get('time_step', 10)     # Harus 10 sesuai training model LSTM kamu
        num_features = data.get('num_features', 7) # Harus 7 sesuai jumlah kolom fitur listrik
        model_path = data.get('model_path')
        
        # 2. Validasi File Model
        if not model_path or not os.path.exists(model_path):
             print(json.dumps({"success": False, "error": f"Model .h5 tidak ditemukan di {model_path}"}))
             return
             
        # 3. Validasi Dimensi Input
        # scaled_input harus berupa matriks 2D (10 baris, 7 kolom)
        input_np = np.array(scaled_input, dtype=np.float32)
        if input_np.ndim != 2 or input_np.shape != (time_step, num_features):
             print(json.dumps({
                 "success": False, 
                 "error": f"Bentuk input {input_np.shape} tidak sesuai. Harus 2D array dengan ukuran ({time_step}, {num_features})."
             }))
             return

        # Fix Keras 3 ke Keras 2 compatibility
        fix_h5_quantization(model_path)

        # Load model tanpa kompilasi (hanya untuk forward pass/prediksi)
        model = tf.keras.models.load_model(model_path, compile=False)

        current_input = input_np.copy()
        future_preds = []

        # 4. Loop Prediksi (Autoregressive)
        for _ in range(horizon):
            # Reshape ke 3D sesuai kebutuhan LSTM: [Batch=1, Time_Steps=10, Features=7]
            inp = current_input.reshape(1, time_step, num_features)
            
            # Prediksi menghasilkan nilai tunggal (target daya/power)
            pred = model.predict(inp, verbose=0)[0][0]
            future_preds.append(float(pred))
            
            # --- Pergeseran Window ke Depan untuk Multistep ---
            # Karena model kita multi-fitur (7 kolom) tapi kita cuma memprediksi 1 nilai baru (index 2 = daya),
            # kita asumsikan fitur lainnya (tegangan, arus, pf) konstan menggunakan data terakhir.
            next_row = current_input[-1].copy() 
            next_row[2] = pred  # Timpa index ke-2 (fitur daya) dengan hasil prediksi baris baru
            
            # Buang baris terlama (paling atas), masukkan baris baru (paling bawah)
            current_input = np.vstack([current_input[1:], next_row])

        # Output JSON ke stdout untuk ditangkap oleh Node.js
        print(json.dumps({"success": True, "forecasts": future_preds}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()