/* ID12: O aluno criou comunicação entre componentes não relacionados hierarquivamente por
meio de serviços através do mecanismo de injeção de dependência, compartilhando lógica ou
informações.  */

import { Component } from '@angular/core';
import { FilterService } from '../filter/filter.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filter-container" (click)="toggleFilterOptions()">
      <span>Ordenar lista</span> <i class="fas fa-filter"></i>
      <div *ngIf="showFilterOptions">
        <button (click)="setFilterOrder('A-Z')">A-Z</button>
        <button (click)="setFilterOrder('Z-A')">Z-A</button>
      </div>
    </div>
  `,
  styleUrls: ['./filter.component.css']
})
export class FilterComponent {
  showFilterOptions = false;

  constructor(private filterService: FilterService) {}

  setFilterOrder(order: 'A-Z' | 'Z-A') {
    this.filterService.updateFilterOrder(order);
    this.toggleFilterOptions();
  }

  toggleFilterOptions() {
    this.showFilterOptions = !this.showFilterOptions;
  }
}
