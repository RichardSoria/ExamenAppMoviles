import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map, filter, take, switchMap } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.userLoaded.pipe(
    filter(loaded => loaded),
    switchMap(() => supabaseService.currentUser.pipe(take(1))),
    map(user => user ? true : router.parseUrl('/auth'))
  );

};

