import { Component } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhotoService } from '../../services/photo.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RegisterPage {

  nombre = '';
  correo = '';
  password = '';
  avatarFile?: File;

  constructor(
    private photoService: PhotoService,
    private supabaseService: SupabaseService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  async tomarFoto() {
    try {
      this.avatarFile = await this.photoService.takePhoto();
      this.mostrarToast('Foto tomada con éxito');
    } catch (error) {
      console.error(error);
      this.mostrarToast('Error al tomar la foto');
    }
  }

  async registrar() {
    const loading = await this.loadingCtrl.create({
      message: 'Registrando usuario...',
      spinner: 'crescent',
      backdropDismiss: false
    });
    await loading.present();

    try {
      let url_image_user = '';

      if (this.avatarFile) {
        url_image_user = await this.supabaseService.uploadFilePublic(this.avatarFile);
      }

      await this.supabaseService.registerUser(
        this.nombre,
        this.correo,
        this.password,
        url_image_user
      );

      this.mostrarToast('Usuario registrado correctamente');
      this.resetForm();

    } catch (error) {
      console.error(error);
      this.mostrarToast('Error al registrar el usuario');
    } finally {
      loading.dismiss();
    }
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }

  resetForm() {
    this.nombre = '';
    this.correo = '';
    this.password = '';
    this.avatarFile = undefined;
  }
}
