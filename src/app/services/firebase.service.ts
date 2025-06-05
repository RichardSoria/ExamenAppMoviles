import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

export interface Opinion {
  opinion: string;
  name: string;
  species: string;
  status: string;
  gender: string;
  origin: string;
  episode: string;
  urlCharacter: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor(private firestore: Firestore) { }

  saveOpinion(
    opinion: string,
    name: string,
    species: string,
    status: string,
    gender: string,
    origin: string,
    episode: string,
    urlCharacter: string
  ) {
    const opinionsRef = collection(this.firestore, 'opinions');

    // Preparar objeto con datos reales, nada de strings vacíos
    const opinionData: Opinion = {
      opinion,
      name,
      species,
      status,
      gender,
      origin,
      episode,
      urlCharacter,
    };

    return addDoc(opinionsRef, opinionData);
  }
}