import { Component, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SupabaseService, FileItem } from '../services/supabase.service';
import { LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { addIcons } from 'ionicons';
import { camera, eye, folderOpenOutline } from 'ionicons/icons';

addIcons({
  camera,
  eye,
  'folder-open-outline': folderOpenOutline
});


@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class Tab2Page implements OnDestroy {
  showPhotos = true;
  photos: FileItem[] = [];
  private subscription?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private loadingCtrl: LoadingController
  ) { }


  ngOnInit() {
    // Suscribirse para obtener la lista actual y reaccionar a cambios
    this.subscription = this.supabaseService.getFileItems().subscribe(files => {
      this.photos = files;
    });

    // Cargar archivos desde supabase para iniciar
    this.supabaseService.loadFiles();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  toggleView() {
    this.showPhotos = !this.showPhotos;
  }

  async captureAndUpload() {
    const loading = await this.loadingCtrl.create({
      message: 'Subiendo foto...',
      spinner: 'crescent',
      backdropDismiss: false
    });

    await loading.present();

    try {
      const photo = await Camera.getPhoto({
        quality: 100,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!photo.base64String) throw new Error('No se capturó la imagen');

      const blob = this.base64ToBlob(photo.base64String, `image/${photo.format}`);
      const file = new File([blob], `photo_${Date.now()}.${photo.format}`, { type: `image/${photo.format}` });

      await this.supabaseService.uploadFile(file, { title: 'Foto tomada con cámara' });
      await this.supabaseService.loadFiles();

    } catch (error: any) {
      console.error(error);
      // Aquí mejor usa un toast para errores (te puedo ayudar con eso también)
    } finally {
      loading.dismiss();
    }
  }

  base64ToBlob(base64: string, contentType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
}
