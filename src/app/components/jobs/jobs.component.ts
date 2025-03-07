import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent {
  formData = {
    nome: '',
    email: '',
    telefone: '',
    curriculo: null as File | null
  };

  formSubmitted = false;
  submissionError: string | null = null;
  submissionSuccess: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.formData.curriculo = target.files[0];
    }
  }

  submitForm() {
    this.formSubmitted = true;
    this.submissionError = null;
    this.submissionSuccess = false;

    console.log(this.formData);

    if (!this.formData.nome || !this.formData.email) {
      this.submissionError = 'Erro ao enviar o formulário. Tente novamente.';
      this.cdr.detectChanges(); 
    } else {
      this.submissionSuccess = true;
    }
  }
}