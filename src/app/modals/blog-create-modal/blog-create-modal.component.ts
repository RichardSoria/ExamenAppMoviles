import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from 'src/app/services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from 'src/app/services/photo.service';

@Component({
  selector: 'app-blog-create-modal',
  templateUrl: './blog-create-modal.component.html',
  styleUrls: ['./blog-create-modal.component.scss'],
  standalone: true,
  imports: [
    // módulos Angular/Ionic que necesites, por ejemplo:
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class BlogCreateModalComponent implements OnInit {
  name_blog = '';
  user_sender: string = '';
  text_blog = '';
  url_image_blog: string | null = null;
  photoFile: File | null = null;


  constructor(
    private modalCtrl: ModalController,
    private supabaseService: SupabaseService,
    private photoService: PhotoService
  ) { }

  async createBlog() {
    if (!this.name_blog.trim() || !this.text_blog.trim()) {
      alert('Título y contenido son obligatorios');
      return;
    }
    try {
      await this.supabaseService.addBlog(
        this.name_blog,
        this.text_blog,
        this.url_image_blog ?? '',
        this.user_sender
      );
      this.modalCtrl.dismiss({ created: true });
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert('Error al crear blog: ' + errorMessage);
    }
  }

  async tomarFoto() {
    try {
      this.photoFile = await this.photoService.takePhoto();
      this.url_image_blog = await this.supabaseService.uploadFilePublic(this.photoFile);
    } catch (err) {
      alert('Error al tomar o subir la foto: ' + (err instanceof Error ? err.message : err));
    }
  }

  async ngOnInit() {
    try {
      const userData = await this.supabaseService.getCurrentUserData();
      this.user_sender = userData.name;
    } catch (error) {
      alert('No se pudo obtener el usuario: ' + (error instanceof Error ? error.message : error));
    }
  }

  close() {
    this.modalCtrl.dismiss({ created: false });
  }
}
