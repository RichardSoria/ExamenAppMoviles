import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class AuthPage implements OnInit {

  // Formulario de autenticación
  // Se utiliza FormBuilder para crear un formulario reactivo que contiene los campos de email y password.
  credentials!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController,
    private router: Router,
    private loadingController: LoadingController,
    private supabaseService: SupabaseService

  ) { }

  ngOnInit() {
    // Inicializa el formulario, creando un grupo de controles con validaciones.
    this.credentials = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  // Al manejar el loadingController, asegurarse que cada que se inicie
  // un método colocar el dismiss, para no dejar el loadingController abierto indefinidamente.

  async login() {
    const loading = await this.loadingController.create();
    await loading.present();

    if (this.credentials.invalid) {
      await loading.dismiss();
      this.showError("Formulario inválido", "Por favor, completa todos los campos correctamente.");
      return;
    }

    this.supabaseService.signIn(this.credentials.value).then(async (data) => {
      await loading.dismiss();
      this.supabaseService.listenToBlogs();
      this.credentials.reset();
    }).catch(async (err) => {
      await loading.dismiss();
      this.showError("Error al iniciar sesión", err.message);
    });
  }

  async register() {
    const loading = await this.loadingController.create();
    await loading.present();

    this.router.navigate(['/register']).then(() => {
      loading.dismiss();
    }).catch(async (err) => {
      await loading.dismiss();
      this.showError("Error al registrar", err.message);
    });
  }

  async showError(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
