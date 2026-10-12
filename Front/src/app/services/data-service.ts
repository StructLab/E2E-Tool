import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor(private http: HttpClient) {}

  // Send file to backend
  async LoadData(file: File, endpoint: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.http
        .post(endpoint, formData)
        .toPromise(); // use firstValueFrom in RxJS 7+

      console.log('Upload successful:', response);
      return response;
    } catch (err) {
      console.error('Upload failed', err);
      throw err;
    }
  }
}