#include <napi.h>

Napi::Value ProcessImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    
    uint8_t* data = buffer.Data();
    size_t length = buffer.Length();
    
    for (size_t i = 0; i < length; i++) {
        data[i] = 255 - data[i];
    }
    
    return buffer;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("processImage", Napi::Function::New(env, ProcessImage));
    return exports;
}

NODE_API_MODULE(addon, Init)