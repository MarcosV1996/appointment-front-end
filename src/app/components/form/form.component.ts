import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IbgeService } from '../ibge.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../services/services2/appointments.service';

interface Estado {
  id: number;
  nome: string;
  sigla: string;
}

interface Cidade {
  id: number;
  nome: string;
}

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, NgxMaskPipe],
  providers: [IbgeService, provideNgxMask(), DatePipe],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {
  registerForm!: FormGroup;
  selectedFile: File | null = null;
  invalidFile: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  states: Estado[] = [];
  cidades: any[] = [];
  availableBeds: number = 0;
  minArrivalDate: string = '';
  maxArrivalDate: string = '';
  selectedArrivalDate: Date | null = null;
  isFullCapacityModalOpen: boolean = false;
  isForeign: boolean = false;
  rulesContent: TemplateRef<any> | null = null;
  isLoadingBeds: boolean = true;

  private readonly ERROR_MESSAGES = {
    invalidFile: 'Arquivo inválido. Apenas arquivos .jpg, .jpeg e .png são aceitos.',
    requiredFields: 'Por favor, preencha todos os campos obrigatórios.',
    underageError: 'Menores de idade não podem realizar agendamentos.',
    registrationSuccess: 'Cadastro realizado com sucesso!',
    registrationError: 'Erro ao realizar o cadastro. Tente novamente.',
    cpfDuplicateError: 'CPF já utilizado para uma reserva. Por favor, utilize outro CPF.',
  };

  constructor(
    private fb: FormBuilder,
    private locale: IbgeService,
    private http: HttpClient,
    private router: Router,
    private modalService: NgbModal,
    private datePipe: DatePipe,
    private appointmentsService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.setDateConstraints();
    this.initializeForm();
    this.loadStates();
    this.loadAvailableBeds();
    this.setupFormListeners();
    this.getAvailableBeds();
    this.checkAvailableBeds();
  
    this.registerForm.get('foreignCountry')?.valueChanges.subscribe((isForeign) => {
      this.handleForeignStatus(isForeign);
    });
  }

  private setDateConstraints(): void {
    const today = new Date();
    this.minArrivalDate = this.formatDate(today);
    this.maxArrivalDate = this.formatDate(this.addDays(today, 14)); // 15 dias incluindo hoje
  }

  updateDateRange(): void {
    const arrivalDateValue = this.registerForm.get('arrival_date')?.value;
    if (arrivalDateValue) {
      this.selectedArrivalDate = new Date(arrivalDateValue);
      this.minArrivalDate = this.formatDate(this.selectedArrivalDate);
      this.maxArrivalDate = this.formatDate(this.addDays(this.selectedArrivalDate, 14));
    } else {
      this.setDateConstraints(); // Volta ao padrão se a data for limpa
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  get isNearDateLimit(): boolean {
    if (!this.selectedArrivalDate) return false;
    const limitDate = this.addDays(this.selectedArrivalDate, 14);
    const today = new Date();
    return limitDate.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 dias
  }

  handleForeignStatus(isForeign: boolean): void {
    const stateControl = this.registerForm.get('state');
    const cityControl = this.registerForm.get('city');
  
    if (isForeign) {
      stateControl?.setValue('Estrangeiro', { emitEvent: false });
      cityControl?.setValue('Não se aplica', { emitEvent: false });
      stateControl?.disable();
      cityControl?.disable();
      this.cidades = [];
    } else {
      stateControl?.enable();
      cityControl?.enable();
      stateControl?.setValue('');
      cityControl?.setValue('');
  
      const selectedStateId = this.registerForm.get('state')?.value;
      if (selectedStateId) {
        this.loadCities(selectedStateId);
      }
    }
  }
  
  private initializeForm(): void {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      last_name: ['', Validators.required],
      cpf: ['', [Validators.required, FormComponent.validarCPF]],
      birth_date: ['', [Validators.required, this.validateAge]],
      mother_name: ['', Validators.required],
      gender: ['', Validators.required],
      arrival_date: ['', Validators.required],
      time: ['', Validators.required],
      state: ['', Validators.required], 
      city: ['', Validators.required],  
      accommodation_mode: ['', Validators.required],
      phone: ['', [
        Validators.pattern(/^\(\d{2}\)\s?9\d{4}-\d{4}$/)
      ]],  
      observation: [''],
      foreignCountry: [{ value: '', disabled: false }],
      noPhone: [false]
    });
  }

  loadAvailableBeds(): void {
    this.isLoadingBeds = true; 
  
    const headers: any = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  
    this.http.get<{ availableBeds: number }>('http://127.0.0.1:8000/api/available-beds', { headers })
      .subscribe({
        next: (response) => {
          console.log('Resposta da API:', response.availableBeds);
          this.availableBeds = response.availableBeds;
          this.isLoadingBeds = false; 
  
          setTimeout(() => this.checkAvailableBeds(), 100);
        },
        error: (error) => {
          console.error('Erro ao buscar vagas disponíveis:', error);
          this.availableBeds = 0;
          this.isLoadingBeds = false; 
        },
      });
  }

  private setupFormListeners(): void {
    this.registerForm.get('foreignCountry')?.valueChanges.subscribe((isForeign) => {
      this.toggleLocationFields(isForeign);
    });

    this.registerForm.get('noPhone')?.valueChanges.subscribe(checked => {
      if (checked) {
        this.registerForm.get('phone')?.setValidators([]);
        this.registerForm.get('phone')?.updateValueAndValidity();
      } else {
        this.registerForm.get('phone')?.setValidators([Validators.pattern(/^\(\d{2}\) 9\d{4}-\d{4}$/)]);
        this.registerForm.get('phone')?.updateValueAndValidity();
      }
    });
  }

  public toggleLocationFields(event: Event): void {
    const isForeign = (event.target as HTMLInputElement).checked;
    this.registerForm.get('foreignCountry')?.setValue(isForeign);
  
    if (isForeign) {
      this.registerForm.patchValue({
        state: 'Estrangeiro',
        city: null
      });
      this.registerForm.get('state')?.disable();
      this.registerForm.get('city')?.disable();
    } else {
      this.registerForm.get('state')?.enable();
      this.registerForm.get('city')?.enable();
      this.registerForm.patchValue({ state: '', city: '' });
    }
  
    this.registerForm.get('state')?.updateValueAndValidity();
    this.registerForm.get('city')?.updateValueAndValidity();
  }

  private togglePhoneField(noPhone: boolean): void {
    const phoneControl = this.registerForm.get('phone');
    if (noPhone) {
      phoneControl?.clearValidators();
      phoneControl?.disable();
    } else {
      phoneControl?.setValidators([
        Validators.required,
        Validators.pattern(/\(\d{2}\) \d{5}-\d{4}/),
      ]);
      phoneControl?.enable();
    }
    phoneControl?.updateValueAndValidity();
  }

  openRulesModal(content: TemplateRef<any>): void {
    if (content) {
      this.modalService.open(content, { centered: true });
    }
  }

  formatName(field: 'name' | 'last_name'): void {
    const control = this.registerForm.get(field);
    if (control && control.value) {
      const formattedValue = control.value
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      control.setValue(formattedValue);
    }
  }

  static validarCPF(control: AbstractControl): ValidationErrors | null {
    const cpf = control.value;
    if (!cpf) return null;

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return { invalidCPF: true };

    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpfLimpo[i - 1]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo[9])) return { invalidCPF: true };

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpfLimpo[i - 1]) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo[10])) return { invalidCPF: true };

    return null;
  }

  validateAge(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
  
    const birthDate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
  
    const isUnderage =
      age < 18 || (age === 18 && today < new Date(birthDate.setFullYear(today.getFullYear())));
  
    return isUnderage ? { underage: true } : null;
  }
  
  loadStates(): void {
    console.log('🔵 Chamando API de estados...');
    this.locale.getEstados().subscribe({
      next: (states: Estado[]) => {
        this.states = states;
      },
    });
  }
   
  onStateChange(event: any): void {
    const stateId = event.target.value;
  
    if (!stateId || stateId === 'foreign') {
      this.cidades = [];
      this.registerForm.get('city')?.disable();
      return;
    }
  
    this.registerForm.get('city')?.enable();
    console.log(`🔵 Chamando API para carregar cidades do estado: ${stateId}`);
    this.loadCities(stateId);
  }
  
  loadCities(stateId: string): void {
    if (!stateId) {
      this.cidades = [];
      console.warn('🟠 Nenhum estado selecionado.');
      return;
    }
  
    this.locale.getCidadesPorEstado(+stateId).subscribe({
      next: (cidades: any[]) => {
        this.cidades = cidades;
      },
      error: (error: any) => {
        this.cidades = [{ id: -1, nome: 'Erro ao carregar cidades' }];
      },
    });
  }
  

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedFile = input.files[0];
      this.invalidFile = false; 
    }
  }

  getAvailableBeds() {
    this.appointmentsService.getAvailableBeds().subscribe((data) => {
      this.availableBeds = data.availableBeds;
    });
  }  

  checkAvailableBeds() {
    if (this.isLoadingBeds) {
      return;
    }

    if (this.availableBeds === 0) {
      this.isFullCapacityModalOpen = true;
      this.registerForm.disable();
      this.registerForm.controls['state'].disable();
      this.registerForm.controls['city'].disable();
      this.registerForm.controls['phone'].disable();

    } else {
      this.isFullCapacityModalOpen = false;
      this.registerForm.enable();
      this.registerForm.controls['state'].enable();
      this.registerForm.controls['city'].enable();
      this.registerForm.controls['phone'].enable();
      this.registerForm.controls['foreignCountryCheck']?.enable();
    }
  }

  closeFullCapacityModal() {
    this.isFullCapacityModalOpen = false;
  }

  onSubmit(content: TemplateRef<any>): void {
    if (this.registerForm.valid) {
      this.loadAvailableBeds();

      if (this.invalidFile) {
        this.errorMessage = this.ERROR_MESSAGES.invalidFile;
        return;
      }

      if (this.registerForm.get('foreignCountry')?.value) {
        this.registerForm.get('state')?.setValue('Estrangeiro');
        this.registerForm.get('city')?.setValue('Não se aplica');
      } else if (!this.registerForm.get('state')?.value) {
        this.errorMessage = 'O campo estado é obrigatório.';
        return;
      }

      const cpfValue = this.registerForm.get('cpf')?.value.replace(/\D/g, '');
      this.registerForm.patchValue({ cpf: cpfValue });

      if (this.registerForm.get('noPhone')?.value) {
        this.registerForm.patchValue({ phone: null });
      }

      const formattedBirthDate = new Date(this.registerForm.get('birth_date')?.value).toISOString().split('T')[0];
      const formattedArrivalDate = new Date(this.registerForm.get('arrival_date')?.value).toISOString().split('T')[0];
      this.registerForm.patchValue({
        birth_date: formattedBirthDate,
        arrival_date: formattedArrivalDate,
      });

      const formData = new FormData();
      formData.append('name', this.registerForm.get('name')?.value);
      formData.append('last_name', this.registerForm.get('last_name')?.value);
      formData.append('cpf', this.registerForm.get('cpf')?.value);
      formData.append('mother_name', this.registerForm.get('mother_name')?.value);
      formData.append('gender', this.registerForm.get('gender')?.value);
      formData.append('birth_date', this.registerForm.get('birth_date')?.value);
      formData.append('arrival_date', this.registerForm.get('arrival_date')?.value);
      formData.append('time', this.registerForm.get('time')?.value);
      formData.append('state', this.registerForm.get('state')?.value);
      formData.append('city', this.registerForm.get('city')?.value);
      formData.append('phone', this.registerForm.get('phone')?.value || '');
      formData.append('observation', this.registerForm.get('observation')?.value || '');

      const accommodationMap: { [key: string]: string } = {
        'Acolhimento 24 horas': '24_horas',
        'Pernoite': 'pernoite',
      };

      const selectedAccommodation = this.registerForm.get('accommodation_mode')?.value;
      const mappedAccommodation = accommodationMap[selectedAccommodation] || selectedAccommodation || 'pernoite';

      formData.append('accommodation_mode', mappedAccommodation);

      if (this.selectedFile) {
        const fileType = this.selectedFile.type;
        if (fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/jpg') {
          formData.append('photo', this.selectedFile, this.selectedFile.name);
        } else {
          this.errorMessage = 'O arquivo selecionado deve ser uma imagem (JPEG, PNG).';
          return;
        }
      } else {
        const existingPhoto = this.registerForm.get('photo')?.value;
        if (existingPhoto) {
          formData.append('photo', existingPhoto);
        }
      }

      const token = localStorage.getItem('authToken');
      if (token) {
        this.http.post('http://127.0.0.1:8000/api/appointments', formData, {
          headers: { Authorization: `Bearer ${token}` },
        }).subscribe({
          next: () => {
            this.successMessage = 'Agendamento realizado com sucesso!';
            this.registerForm.reset();
            this.loadAvailableBeds();
            this.openSuccessModal(content);
          },
          error: (error) => {
            if (error.status === 409) {
              if (confirm('Já existe um agendamento com este CPF. Deseja substituir?')) {
                formData.append('replace', 'true');
                this.http.post('http://127.0.0.1:8000/api/appointments', formData, {
                  headers: { Authorization: `Bearer ${token}` },
                }).subscribe({
                  next: () => {
                    this.successMessage = 'Agendamento atualizado com sucesso!';
                    this.registerForm.reset();
                    this.loadAvailableBeds();
                    this.openSuccessModal(content);
                  },
                  error: () => {
                    this.errorMessage = 'Erro ao substituir o agendamento.';
                  },
                });
              }
            } else {
              this.errorMessage = 'Erro ao processar o agendamento.';
            }
          },
        });
      }
    } else {
      this.markInvalidFields();
      this.errorMessage = this.ERROR_MESSAGES.requiredFields;
    }
  }

  private formatDates(): void {
    const formattedBirthDate = new Date(this.registerForm.get('birth_date')?.value).toISOString().split('T')[0];
    this.registerForm.patchValue({ birth_date: formattedBirthDate });

    const formattedArrivalDate = new Date(this.registerForm.get('arrival_date')?.value).toISOString().split('T')[0];
    this.registerForm.patchValue({ arrival_date: formattedArrivalDate });
  }

  private prepareFormData(): FormData {
    const formData = new FormData();

    formData.append('name', this.registerForm.get('name')?.value);
    formData.append('last_name', this.registerForm.get('last_name')?.value);
    formData.append('cpf', this.registerForm.get('cpf')?.value);
    formData.append('mother_name', this.registerForm.get('mother_name')?.value || '');
    formData.append('gender', this.registerForm.get('gender')?.value);
    formData.append('birth_date', this.registerForm.get('birth_date')?.value);
    formData.append('arrival_date', this.registerForm.get('arrival_date')?.value);
    formData.append('time', this.registerForm.get('time')?.value);
    formData.append('state', this.getStateName(this.registerForm.get('state')?.value));
    formData.append('city', this.getCityName(this.registerForm.get('city')?.value));
    formData.append('phone', this.registerForm.get('phone')?.value || '');
    formData.append('observation', this.registerForm.get('observation')?.value || '');
    formData.append('accommodation_mode', this.registerForm.get('accommodation_mode')?.value || '');

    console.log('Modalidade de Acolhimento:', this.registerForm.get('accommodation_mode')?.value);

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile, this.selectedFile.name);
    }

    return formData;
  }

  private submitToApi(formData: FormData, content: TemplateRef<any>, token: string): void {
    this.http.post('http://127.0.0.1:8000/api/appointments', formData, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: () => {
        this.successMessage = this.ERROR_MESSAGES.registrationSuccess;
        this.loadAvailableBeds(); 
        this.openSuccessModal(content); 
      },
      error: (error) => {
        console.error('Erro ao enviar dados:', error);
        this.errorMessage = this.ERROR_MESSAGES.registrationError;
      }
    });
  }

  private handleInvalidForm(): void {
    this.markInvalidFields();
    this.errorMessage = this.ERROR_MESSAGES.requiredFields;
  }

  private markInvalidFields(): void {
    Object.keys(this.registerForm.controls).forEach((field) => {
      const control = this.registerForm.get(field);
      if (control && control.invalid) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  private getStateName(stateId: string): string {
    const state = this.states.find(s => s.id.toString() === stateId);
    return state ? state.nome : '';
  }

  private getCityName(cityId: string): string {
    const city = this.cidades.find(c => c.id.toString() === cityId);
    return city ? city.nome : '';
  }

  private openSuccessModal(content: TemplateRef<any>): void {
    this.modalService.open(content, { centered: true });
  }
}