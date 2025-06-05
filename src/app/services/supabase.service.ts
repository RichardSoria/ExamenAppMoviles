import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, createClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DomSanitizer } from '@angular/platform-browser';

const Messages_DB = 'messages';
const Archivos_DB = 'files';

export interface Message {
  text: string;
  user_sender: string;
}

export interface FileInfo {
  title: string;
  file_name?: string;
  file_url?: string;
}

export interface FileItem {
  file_name: string;
  file_url: any;
  title: string;
  user_sender: string;
  id: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _messages: BehaviorSubject<Message[]> = new BehaviorSubject<Message[]>([]);
  private _fileItems: BehaviorSubject<FileItem[]> = new BehaviorSubject<FileItem[]>([]);
  private _currentUser: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  private _userLoaded = new BehaviorSubject(false);

  private supabase: SupabaseClient;
  private messageChannel: any = null;

  constructor(private router: Router, private sanitizer: DomSanitizer) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this._currentUser.next(session.user);
        this.loadMessages();
        this.listenToMessages();
        this.loadFiles();
        this.router.navigate(['/tabs/tab1']);
      } else if (event === 'SIGNED_OUT') {
        this._currentUser.next(null);
        this.router.navigate(['/auth']);
        this.unsubscribeFromMessages();
        this._fileItems.next([]);
        this._messages.next([]);
      }
    });

    this.loadUser();
  }

  // Usuario actual
  async loadUser() {
    const { data } = await this.supabase.auth.getUser();

    if (data?.user) {
      this._currentUser.next(data.user);
      this.loadMessages();
      this.listenToMessages();
      this.loadFiles();
    } else {
      this._currentUser.next(null);
    }

    this._userLoaded.next(true);
  }

  get userLoaded(): Observable<boolean> {
    return this._userLoaded.asObservable();
  }

  get currentUser(): Observable<User | null> {
    return this._currentUser.asObservable();
  }

  // Métodos de autenticación (puedes eliminar si no usas aquí)
  signIn(credentials: { email: string; password: string }) {
    return this.supabase.auth.signInWithPassword(credentials);
  }

  signUp(credentials: { email: string; password: string }) {
    return this.supabase.auth.signUp(credentials);
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  // ******** Mensajes ********
  get messages(): Observable<Message[]> {
    return this._messages.asObservable();
  }

  async loadMessages() {
    const { data, error } = await this.supabase.from(Messages_DB).select('*');
    if (error) {
      console.error('Error al cargar mensajes:', error.message);
      this._messages.next([]);
      return;
    }
    this._messages.next(data || []);
  }

  listenToMessages() {
    if (this.messageChannel) return;
    this.messageChannel = this.supabase
      .channel('messages-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: Messages_DB },
        (payload) => {
          const newMessage = payload.new as Message;
          const current = this._messages.getValue();

          const exists = current.some(
            (m) => m.text === newMessage.text && m.user_sender === newMessage.user_sender
          );

          if (!exists) {
            this._messages.next([...current, newMessage]);
          }
        }
      )
      .subscribe();
  }

  unsubscribeFromMessages() {
    if (this.messageChannel) {
      this.supabase.removeChannel(this.messageChannel);
      this.messageChannel = null;
    }
  }

  async addMessage(text: string, user_sender: string) {
    const newMessage = { text, user_sender };
    const { data, error } = await this.supabase.from(Messages_DB).insert(newMessage).select();

    if (error) {
      console.error('Error insertando mensaje:', error);
      return;
    }

    if (data && data.length > 0) {
      const current = this._messages.getValue();
      this._messages.next([...current, data[0]]);
    }
  }

  // ******** Archivos ********
  getFileItems(): Observable<FileItem[]> {
    return this._fileItems.asObservable();
  }

  async uploadFile(file: File, info: FileInfo): Promise<string> {
    const time = Date.now();
    const { data: userData, error: userError } = await this.supabase.auth.getUser();

    if (userError || !userData?.user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const userEmail = userData.user.email;
    const bucketName = 'files';
    const filePath = `${userEmail}/${time}-${file.name}`;

    const { error: uploadError } = await this.supabase.storage.from(bucketName).upload(filePath, file);

    if (uploadError) {
      throw new Error('Error al subir el archivo: ' + uploadError.message);
    }

    const { data: urlData } = this.supabase.storage.from(bucketName).getPublicUrl(filePath);

    info.file_name = filePath;
    info.file_url = urlData.publicUrl;

    return await this.saveFileInfo(info);
  }

  async saveFileInfo(info: FileInfo): Promise<any> {
    const { data: userData } = await this.supabase.auth.getUser();

    const newFile = {
      file_name: info.file_name || '',
      title: info.title,
      user_sender: userData?.user?.email || '',
      file_url: info.file_url || ''
    };

    return this.supabase.from(Archivos_DB).insert(newFile);
  }

  async loadFiles(): Promise<void> {
    const { data: userData } = await this.supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      this._fileItems.next([]);
      return;
    }

    const { data, error } = await this.supabase
      .from(Archivos_DB)
      .select('*')
      .eq('user_sender', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar archivos:', error.message);
      this._fileItems.next([]);
      return;
    }

    const mapped = (data || []).map((item: any) => {
      let createdAt = item.created_at;
      if (createdAt && !createdAt.endsWith('Z')) {
        createdAt += 'Z';
      }

      return {
        file_url: this.sanitizer.bypassSecurityTrustResourceUrl(item.file_url),
        file_name: item.file_name,
        title: item.title,
        user_sender: item.user_sender,
        id: item.id,
        created_at: createdAt ? createdAt.toString() : undefined,
      };
    });

    this._fileItems.next(mapped);
  }

  async removeFile(item: FileItem): Promise<void> {
    const bucketName = 'files';

    await this.supabase.from(Archivos_DB).delete().match({ id: item.id });

    await this.supabase.storage.from(bucketName).remove([item.file_name]);

    const current = this._fileItems.value;
    const updated = current.filter((f) => f.id !== item.id);
    this._fileItems.next([...updated]);
  }
}
