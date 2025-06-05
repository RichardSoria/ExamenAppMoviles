import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent, ModalController } from '@ionic/angular';
import { SupabaseService, Blog } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';

// Aquí asumo que crearás un componente Modal para crear blogs
import { BlogCreateModalComponent } from '../modals/blog-create-modal/blog-create-modal.component'

@Component({
  selector: 'app-blogs',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class Tab1Page implements OnInit, AfterViewInit {
  blogs: Blog[] = [];
  user_sender: string = '';

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    this.supabaseService.currentUser.subscribe((user) => {
      this.user_sender = user?.email || '';
    });
  }

  ngOnInit() {
    this.supabaseService.loadBlogs().then(() => {
      this.supabaseService.blogs.subscribe((blogs) => {
        this.blogs = blogs;
        setTimeout(() => this.scrollToBottom(), 100);
      });
    });
    this.supabaseService.listenToBlogs();
  }

  ngAfterViewInit() {
    window.addEventListener('keyboardDidShow', () => this.scrollToBottom());
  }

  async openCreateBlogModal() {
    const modal = await this.modalCtrl.create({
      component: BlogCreateModalComponent,
      componentProps: { user_sender: this.user_sender },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.created) {
      // Recarga blogs o agrega directamente si tu modal retorna el nuevo blog
      await this.supabaseService.loadBlogs();
    }
  }

  scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
  }

  logOut() {
    this.supabaseService.signOut();
  }
}
