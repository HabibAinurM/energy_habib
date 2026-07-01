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
    sys.exit(0)

try:
    import sklearn
except ImportError:
    print(json.dumps({"success": False, "error": "Modul scikit-learn tidak ditemukan. Silakan jalankan 'pip install scikit-learn' di server."}))
    sys.exit(0)

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
        raw_input_list = data.get('input', [])     # Array 2D berukuran (10, 7) mentah
        horizon = data.get('horizon', 1)         
        time_step = data.get('time_step', 10)     
        num_features = data.get('num_features', 7) 
        model_path = data.get('model_path')
        
        # 2. Validasi File Model
        if not model_path or not os.path.exists(model_path):
             print(json.dumps({"success": False, "error": f"Model .h5 tidak ditemukan di {model_path}"}))
             return
             
        # 3. Validasi & Normalisasi Skala Input (WAJIB)
        input_np = np.array(raw_input_list, dtype=np.float32)
        if input_np.ndim != 2 or input_np.shape != (time_step, num_features):
             print(json.dumps({
                 "success": False, 
                 "error": f"Bentuk input {input_np.shape} tidak sesuai. Harus 2D array dengan ukuran ({time_step}, {num_features})."
             }))
             return

        # Load dua scaler terpisah (satu untuk 6 fitur input, satu untuk 1 fitur target)
        feature_scaler_path = os.path.join(os.path.dirname(model_path), 'scaler_energi_best.pkl')
        target_scaler_path = os.path.join(os.path.dirname(model_path), 'scaler_target_energi.pkl')
        
        if not os.path.exists(feature_scaler_path) or not os.path.exists(target_scaler_path):
             print(json.dumps({"success": False, "error": "Salah satu file scaler tidak ditemukan di folder ml_model."}))
             return

        try:
            import joblib
            feature_scaler = joblib.load(feature_scaler_path)
            target_scaler = joblib.load(target_scaler_path)
        except Exception as e_joblib:
            try:
                import pickle
                with open(feature_scaler_path, 'rb') as f1, open(target_scaler_path, 'rb') as f2:
                    feature_scaler = pickle.load(f1)
                    target_scaler = pickle.load(f2)
            except Exception as e_pickle:
                 print(json.dumps({"success": False, "error": f"Gagal meload scaler. Error: {str(e_pickle)}"}))
                 return

        # Lakukan normalisasi (transform) data mentah sebelum masuk model menggunakan FEATURE SCALER
        try:
            scaled_input_np = feature_scaler.transform(input_np)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Gagal menormalisasi data: {str(e)}"}))
            return

        # Fix Keras 3 ke Keras 2 compatibility
        fix_h5_quantization(model_path)

        # Load model tanpa kompilasi (hanya untuk forward pass/prediksi)
        model = tf.keras.models.load_model(model_path, compile=False)

        current_input = scaled_input_np.copy()
        future_preds_scaled = []

        # 4. Loop Prediksi (Autoregressive) menggunakan skala 0-1
        # [OPTIMASI KINERJA] Kita konversi ke Tensor sekali saja agar loop lebih ringan
        current_input_tf = tf.convert_to_tensor(current_input.reshape(1, time_step, num_features), dtype=tf.float32)

        for _ in range(horizon):
            # Prediksi menggunakan direct call (jauh lebih cepat daripada model.predict di dalam loop)
            pred_tensor = model(current_input_tf, training=False)
            pred_scaled = float(pred_tensor[0][0])
            future_preds_scaled.append(pred_scaled)
            
            # Geser window (Buang indeks ke-0, tambahkan tebakan baru di akhir)
            next_row = current_input[-1].copy()
            next_row[2] = pred_scaled
            current_input = np.vstack([current_input[1:], next_row])
            
            # Update tensor untuk iterasi berikutnya
            current_input_tf = tf.convert_to_tensor(current_input.reshape(1, time_step, num_features), dtype=tf.float32)

        # Kembalikan skala (Inverse Transform) ke satuan asli (Watt) menggunakan TARGET SCALER
        preds_2d = np.array(future_preds_scaled).reshape(-1, 1)
        unscaled_array = target_scaler.inverse_transform(preds_2d)
        
        # Ambil kolom daya yang sudah kembali ke Watt
        # Dan pastikan hasilnya tidak kurang dari 0 (karena daya listrik tidak bisa minus)
        future_preds_real = [max(0.0, float(val[0])) for val in unscaled_array]

        # Output JSON ke stdout untuk ditangkap oleh Node.js
        print(json.dumps({"success": True, "forecasts": future_preds_real}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()