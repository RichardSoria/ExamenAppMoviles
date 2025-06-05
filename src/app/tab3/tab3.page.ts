import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class Tab3Page implements OnInit {
  nameFind: string = '';
  characterDetails: any = null;
  opinion: string = '';
  charactersList: any[] = [];  // Lista para personajes iniciales

  constructor(
    private http: HttpClient,
    private FirebaseService: FirebaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.loadInitialCharacters();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'primary'
    });
    toast.present();
  }

  async presentLoading(message = 'Cargando...') {
    const loading = await this.loadingCtrl.create({
      message,
      spinner: 'circles'
    });
    await loading.present();
    return loading;
  }

  // Carga inicial de personajes populares (por ej: primeros 6)
  async loadInitialCharacters() {
    const loading = await this.presentLoading('Cargando personajes...');
    try {
      // API permite traer varios personajes por IDs separados por coma
      const url = `https://rickandmortyapi.com/api/character/[1,2,3,4,5,6]`;
      const response = await this.http.get<any>(url).toPromise();
      // response puede ser array si se consultan varios ids
      this.charactersList = Array.isArray(response) ? response : [response];
    } catch (error) {
      console.error('Error cargando personajes iniciales:', error);
      this.showToast('Error cargando personajes iniciales');
    } finally {
      await loading.dismiss();
    }
  }

  async findCharacter() {
    if (!this.nameFind.trim()) {
      return this.showToast('Por favor, ingrese un nombre de personaje.');
    }

    this.characterDetails = null;  // Limpio detalles para mostrar la búsqueda

    const loading = await this.presentLoading();

    const name = this.nameFind.trim().toLowerCase();
    const url = `https://rickandmortyapi.com/api/character/?name=${name}`;

    this.http.get<any>(url).subscribe({
      next: async (response: any) => {
        await loading.dismiss();
        if (response.results && response.results.length > 0) {
          const exactMatch = response.results.find(
            (char: any) => char.name.toLowerCase() === name
          );
          if (exactMatch) {
            this.characterDetails = exactMatch;
          } else {
            this.characterDetails = null;
            this.showToast('No se encontró ningún personaje con ese nombre exacto.');
          }
        } else {
          this.characterDetails = null;
          this.showToast('No se encontró ningún personaje con ese nombre.');
        }
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Error al buscar personaje:', err);
        this.characterDetails = null;
        this.showToast('Ocurrió un error al buscar el personaje.');
      }
    });
  }

  async saveOpinion() {
    if (!this.opinion) {
      return this.showToast('Por favor, complete todos los campos.');
    }

    if (!this.characterDetails) {
      return this.showToast('No hay personaje seleccionado.');
    }

    const loading = await this.presentLoading();

    const { url = '', name = '', species = '', status = '', gender = '', origin = { name: '' }, episode = [] } = this.characterDetails;

    this.FirebaseService.saveOpinion(
      this.opinion,
      name,
      species,
      status,
      gender,
      origin.name,
      episode.length,
      url
    ).then(async () => {
      await loading.dismiss();
      this.showToast('Opinión guardada con éxito');
      this.resetOpinion();
    }).catch(async (error) => {
      await loading.dismiss();
      console.error('Error al guardar la opinión:', error);
      this.showToast('Error al guardar la opinión');
    });
  }

  resetOpinion() {
    this.opinion = '';
  }
}
