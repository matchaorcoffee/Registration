import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from '../models/event.model';

const DB_NAME = 'evently_user_db';
const DB_VERSION = 1;
const STORE_USERS = 'users';
const STORE_SESSION = 'session';

/**
 * IndexedDB-backed database for user accounts and the active session.
 * All public methods return Observables so callers can react asynchronously.
 */
@Injectable({ providedIn: 'root' })
export class UserDatabaseService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDatabase();
  }

  // ── Open / upgrade DB ───────────────────────────────────────────────────

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Users store — keyed by email (unique)
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          const userStore = db.createObjectStore(STORE_USERS, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Session store — single row keyed by a fixed key 'current'
        if (!db.objectStoreNames.contains(STORE_SESSION)) {
          db.createObjectStore(STORE_SESSION, { keyPath: 'key' });
        }
      };

      req.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
      req.onerror   = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
  }

  // ── Generic helpers ──────────────────────────────────────────────────────

  private async tx<T>(
    store: string,
    mode: IDBTransactionMode,
    work: (s: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.dbPromise;
    return new Promise<T>((resolve, reject) => {
      const txn = db.transaction(store, mode);
      const req  = work(txn.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Users ────────────────────────────────────────────────────────────────

  /** Return all users stored in IndexedDB */
  getAllUsers(): Observable<User[]> {
    return from(this.tx<User[]>(STORE_USERS, 'readonly', s => s.getAll()));
  }

  /** Find a single user by email address */
  getUserByEmail(email: string): Observable<User | undefined> {
    return from(
      this.dbPromise.then(db => new Promise<User | undefined>((resolve, reject) => {
        const txn = db.transaction(STORE_USERS, 'readonly');
        const idx = txn.objectStore(STORE_USERS).index('email');
        const req = idx.get(email.toLowerCase().trim());
        req.onsuccess = () => resolve(req.result as User | undefined);
        req.onerror   = () => reject(req.error);
      }))
    );
  }

  /** Insert or replace a user record */
  saveUser(user: User): Observable<void> {
    const normalized: User = { ...user, email: user.email.toLowerCase().trim() };
    return from(this.tx<IDBValidKey>(STORE_USERS, 'readwrite', s => s.put(normalized))).pipe(
      map(() => void 0)
    );
  }

  /** Save an array of users (bulk upsert) */
  saveUsers(users: User[]): Observable<void> {
    return from(
      this.dbPromise.then(db => new Promise<void>((resolve, reject) => {
        const txn   = db.transaction(STORE_USERS, 'readwrite');
        const store = txn.objectStore(STORE_USERS);
        users.forEach(u => store.put({ ...u, email: u.email.toLowerCase().trim() }));
        txn.oncomplete = () => resolve();
        txn.onerror    = () => reject(txn.error);
      }))
    );
  }

  // ── Session (current logged-in user) ────────────────────────────────────

  /** Persist the active session */
  saveSession(user: User): Observable<void> {
    return from(
      this.tx<IDBValidKey>(STORE_SESSION, 'readwrite', s => s.put({ key: 'current', user }))
    ).pipe(map(() => void 0));
  }

  /** Read the active session; resolves to null when no one is logged in */
  getSession(): Observable<User | null> {
    return from(
      this.tx<{ key: string; user: User } | undefined>(STORE_SESSION, 'readonly', s => s.get('current'))
    ).pipe(
      map(row => row?.user ?? null),
      catchError(() => of(null))
    );
  }

  /** Remove the active session (sign out) */
  clearSession(): Observable<void> {
    return from(
      this.tx<undefined>(STORE_SESSION, 'readwrite', s => s.delete('current'))
    ).pipe(map(() => void 0));
  }
}
