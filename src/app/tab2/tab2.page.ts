import { Component, OnDestroy } from '@angular/core';
import { IonicModule, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { SupabaseService, FileItem } from '../services/supabase.service';
import { PhotoService } from '../services/photo.service';
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
  imports: [IonicModule, CommonModule],
})
export class Tab2Page implements OnDestroy {
  showPhotos = true;
  photos: FileItem[] = [];
  private subscription?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private photoService: PhotoService,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.subscription = this.supabaseService.getFileItems().subscribe(files => {
      this.photos = files;
    });
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
      const file = await this.photoService.takePhoto();
      await this.supabaseService.uploadFile(file, { title: 'Foto tomada con cámara' });
      await this.supabaseService.loadFiles();

    } catch (error: any) {
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }
}
