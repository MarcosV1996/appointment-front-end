/* ID12: O aluno criou comunicação entre componentes não relacionados hierarquivamente por
 meio de serviços através do mecanismo de injeção de dependência, compartilhando lógica 
 ou informações. */
 
import { Component, OnInit } from '@angular/core';
import { FilterService } from '../filter/filter.service';
import { FilterComponent } from '../filter/filter.component';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-partnerships',
  standalone: true,
  imports: [CommonModule, FilterComponent], 
  templateUrl: './partnerships.component.html',
  styleUrl: './partnerships.component.css'
})
export class PartnershipsComponent implements OnInit {
  partners: { name: string; image: string }[] = [
    { name: 'Sebrae', image: 'assets/img/sebrae.png' },
    { name: 'Repsol', image: 'assets/img/repsol.jpg' },
    { name: 'Amazon', image: 'assets/img/amazon.jpg' },
    { name: 'Santander', image: 'assets/img/santander.jpg' },
    { name: 'Coca-Cola', image: 'assets/img/coca-cola.png' },
    { name: 'Samsung', image: 'assets/img/samsung.png' },
    { name: 'Hyundai', image: 'assets/img/hynday.png' },
    { name: 'Apple', image: 'assets/img/aguila.png' },
    { name: 'Adidas', image: 'assets/img/Adidas_Logo.svg' },
    { name: 'Disney', image: 'assets/img/Disney+_2024.svg' },
    { name: 'Starbucks', image: 'assets/img/star.jpg'},
    { name: 'Walmart', image: 'assets/img/f3.jpg' }
  ];
  
  filteredPartners: { name: string; image: string }[] = this.partners; 

  constructor(private filterService: FilterService) {}

  ngOnInit() {
    this.filterService.currentFilterOrder.subscribe(order => {
      this.filteredPartners = this.partners.sort((a, b) => {
        if (order === 'A-Z') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
    });
  }
}
