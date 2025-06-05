import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Message } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { IonicModule, IonContent } from '@ionic/angular';

@Component({
  selector: 'app-chat',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class Tab1Page implements OnInit, AfterViewInit {
  messages: Message[] = [];
  newMessage: string = '';
  user_sender: string = '';

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.supabaseService.currentUser.subscribe((user) => {
      this.user_sender = user?.email || '';
    });
  }

  ngOnInit() {
    this.supabaseService.loadMessages().then(() => {
      this.supabaseService.messages.subscribe((messages) => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      });
    });
    this.supabaseService.listenToMessages();
  }

  ngAfterViewInit() {
    window.addEventListener('keyboardDidShow', () => this.scrollToBottom());
  }

  sendeNewMessage() {
    if (this.newMessage.trim() !== '') {
      this.supabaseService
        .addMessage(this.newMessage, this.user_sender)
        .then(() => {
          this.newMessage = '';
          setTimeout(() => this.scrollToBottom(), 100);
        });
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
