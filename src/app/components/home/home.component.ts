import { Component } from '@angular/core';
import { PartnershipsComponent } from '../partnerships/partnerships.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true, 
  imports: [CommonModule, PartnershipsComponent, FooterComponent], 
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
