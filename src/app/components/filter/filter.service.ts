import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filterOrder = new BehaviorSubject<'A-Z' | 'Z-A'>('A-Z');
  currentFilterOrder = this.filterOrder.asObservable();

  updateFilterOrder(newOrder: 'A-Z' | 'Z-A') {
    this.filterOrder.next(newOrder);
  }
}
