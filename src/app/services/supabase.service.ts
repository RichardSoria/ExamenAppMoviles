import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, createClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DomSanitizer } from '@angular/platform-browser';

const Blogs_DB = 'blogs';
const Archivos_DB = 'files';

export interface Blog {
  id?: number;
  name_blog: string;
  user_sender: string;
  text_blog: string;
  url_image_blog: string;
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
  private _blogs: BehaviorSubject<Blog[]> = new BehaviorSubject<Blog[]>([]);
  private _fileItems: BehaviorSubject<FileItem[]> = new BehaviorSubject<FileItem[]>([]);
  private _currentUser: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  private _userLoaded = new BehaviorSubject(false);

  private supabase: SupabaseClient;
  private blogChannel: any = null;

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
        this.loadBlogs();
        this.listenToBlogs();
        this.loadFiles();
        this.router.navigate(['/tabs/tab1']);
      } else if (event === 'SIGNED_OUT') {
        this._currentUser.next(null);
        this.router.navigate(['/auth']);
        this.unsubscribeFromBlogs();
        this._fileItems.next([]);
        this._blogs.next([]);
      }
    });

    this.loadUser();
  }

  // Usuario actual
  async loadUser() {
    const { data } = await this.supabase.auth.getUser();

    if (data?.user) {
      this._currentUser.next(data.user);
      this.loadBlogs();
      this.listenToBlogs();
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

  async registerUser(name: string, email: string, password: string, url_image_user: string) {
    // Registro con supabase.auth.signUp
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user?.id) {
      throw new Error('No se pudo obtener el ID del usuario registrado');
    }

    // Insertar datos adicionales en tabla 'users'
    const { error: insertError } = await this.supabase
      .from('users')
      .insert({
        userId: data.user.id,
        name,
        email,
        url_image_user
      });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  getPublicUrl(fileName: string): string {
    return this.supabase.storage.from(Archivos_DB).getPublicUrl(fileName).data.publicUrl;
  }


  signOut() {
    return this.supabase.auth.signOut();
  }

  // ******** Mensajes ********
  get blogs(): Observable<Blog[]> {
    return this._blogs.asObservable();
  }

  async loadBlogs() {
    const { data, error } = await this.supabase.from(Blogs_DB).select('*').order('created_at', { ascending: true });

    if (error) {
      console.error('Error al cargar blogs:', error);
      return;
    }

    this._blogs.next(data as Blog[]);
  }

  // Escuchar nuevos blogs en tiempo real
  listenToBlogs() {
    if (this.blogChannel) return;

    this.blogChannel = this.supabase
      .channel('blogs-insert-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: Blogs_DB,
        },
        (payload) => {
          const newBlog = payload.new as Blog;
          const current = this._blogs.getValue();

          const exists = current.some(
            (b) => b.name_blog === newBlog.name_blog && b.text_blog === newBlog.text_blog
          );

          if (!exists) {
            this._blogs.next([...current, newBlog]);
          }
        }
      )
      .subscribe();
  }

  // Dejar de escuchar blogs
  unsubscribeFromBlogs() {
    if (this.blogChannel) {
      this.supabase.removeChannel(this.blogChannel);
      this.blogChannel = null;
    }
  }

  // Añadir un nuevo blog
  async addBlog(name_blog: string, text_blog: string, url_image_blog: string, user_sender: string) {
    const newBlog: Blog = { name_blog, text_blog, url_image_blog, user_sender };

    const { data, error } = await this.supabase.from(Blogs_DB).insert(newBlog).select();

    if (error) {
      console.error('Error insertando blog:', error);
      return;
    }

    if (data && data.length > 0) {
      const current = this._blogs.getValue();
      this._blogs.next([...current, data[0]]);
    }
  }

  // Actualizar un blog existente
  async updateBlog(id: number, changes: Partial<Blog>) {
    const { data, error } = await this.supabase
      .from(Blogs_DB)
      .update(changes)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error actualizando blog:', error);
      return;
    }

    if (data && data.length > 0) {
      const updated = data[0];
      const current = this._blogs.getValue().map((b) => (b.id === id ? updated : b));
      this._blogs.next(current);
    }
  }

  async getCurrentUserData() {
    const { data: authData, error: authError } = await this.supabase.auth.getUser();

    if (!authData?.user?.email) {
      throw new Error('Usuario no autenticado');
    }
    const userEmail = authData.user.email;

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      throw new Error('No se pudo encontrar al usuario en la base de datos');
    }

    return userData;
  }


  // ******** Archivos ********
  getFileItems(): Observable<FileItem[]> {
    return this._fileItems.asObservable();
  }

  async uploadFilePublic(file: File): Promise<string> {
    const fileName = `avatar_${Date.now()}_${file.name}`;

    const { error } = await this.supabase.storage
      .from(Archivos_DB)
      .upload(fileName, file, {
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error al subir archivo:', error.message);
      throw new Error('Error al subir el archivo');
    }

    const { data: publicUrlData } = this.supabase
      .storage
      .from(Archivos_DB)
      .getPublicUrl(fileName);

    if (!publicUrlData.publicUrl) {
      throw new Error('No se pudo obtener la URL pública');
    }

    return publicUrlData.publicUrl;
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
