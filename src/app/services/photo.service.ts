import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  constructor() {}

  async takePhoto(): Promise<File> {
    const photo = await Camera.getPhoto({
      quality: 100,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });

    if (!photo.base64String) {
      throw new Error('No se capturó la imagen');
    }

    const blob = this.base64ToBlob(photo.base64String, `image/${photo.format}`);
    const file = new File([blob], `photo_${Date.now()}.${photo.format}`, {
      type: `image/${photo.format}`
    });

    return file;
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
  
}
