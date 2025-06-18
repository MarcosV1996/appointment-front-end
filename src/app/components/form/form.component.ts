import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IbgeService } from '../ibge.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  @ViewChild('duplicateCpfModal') private duplicateCpfModal!: TemplateRef<any>;

  registerForm!: FormGroup;
  selectedFile: File | null = null;
  invalidFile: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  states: Estado[] = [];
  cidades: Cidade[] = [];
  availableBeds: number = 0;
  minArrivalDate: string = '';
  maxArrivalDate: string = '';
  maxBirthDate: string = '';
  selectedArrivalDate: Date | null = null;
  isFullCapacityModalOpen: boolean = false;
  isForeign: boolean = false;
  rulesContent: TemplateRef<any> | null = null;
  isLoadingBeds: boolean = true;
  isLoading: boolean = false;

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
    const today = new Date();
    const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.maxBirthDate = maxBirthDate.toISOString().split('T')[0];
    
    this.initializeForm();
    this.loadStates();
    
    this.loadAvailableBeds().then(() => {
      this.setupFormListeners();
      this.registerForm.get('foreignCountry')?.valueChanges.subscribe((isForeign) => {
        this.toggleLocationFields(isForeign);
      });
    });

    this.getCsrfToken();
  }

  private async getCsrfToken(): Promise<boolean> {
    try {
      document.cookie = 'XSRF-TOKEN=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      await this.http.get('http://localhost:8000/sanctum/csrf-cookie', {
        withCredentials: true,
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        })
      }).toPromise();
  
      const csrfToken = this.getCookie('XSRF-TOKEN');
      if (!csrfToken) {
        console.error('CSRF Token não encontrado após a requisição');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao obter CSRF token:', error);
      return false;
    }
  }

  private setDateConstraints(): void {
    const today = new Date();
    this.minArrivalDate = this.formatDate(today);
    this.maxArrivalDate = this.formatDate(this.addDays(today, 14));
  }

  updateDateRange(): void {
    const arrivalDateValue = this.registerForm.get('arrival_date')?.value;
    if (arrivalDateValue) {
      this.selectedArrivalDate = new Date(arrivalDateValue);
      this.minArrivalDate = this.formatDate(this.selectedArrivalDate);
      this.maxArrivalDate = this.formatDate(this.addDays(this.selectedArrivalDate, 14));
    } else {
      this.setDateConstraints();
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

  loadAvailableBeds(): Promise<void> {
    return new Promise((resolve) => {
      this.isLoadingBeds = true;
      
      this.http.get<{ availableBeds: number }>('http://localhost:8000/api/available-beds', {
        withCredentials: true
      }).subscribe({
        next: (response: { availableBeds: number }) => {
          this.availableBeds = response.availableBeds;
          this.isLoadingBeds = false;
          this.checkAvailableBeds();
          resolve();
        },
        error: (error) => {
          console.error('Erro ao buscar vagas disponíveis:', error);
          this.availableBeds = 0;
          this.isLoadingBeds = false;
          this.checkAvailableBeds();
          resolve();
        }
      });
    });
  }

  checkAvailableBeds(): void {
    if (this.availableBeds <= 0) {
      this.isFullCapacityModalOpen = true;
      this.registerForm.disable();
    } else {
      this.isFullCapacityModalOpen = false;
      this.registerForm.enable();
      
      if (this.registerForm.get('foreignCountry')?.value) {
        this.registerForm.get('state')?.disable();
        this.registerForm.get('city')?.disable();
      }
      
      if (this.registerForm.get('noPhone')?.value) {
        this.registerForm.get('phone')?.disable();
      }
    }
  }

  closeFullCapacityModal(): void {
    this.isFullCapacityModalOpen = false;
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
      cpf: ['', [Validators.required, this.validateCpf]],
      birth_date: ['', [Validators.required, this.validateAge]],
      mother_name: ['', Validators.required],
      gender: ['', Validators.required],
      arrival_date: ['', Validators.required],
      time: ['', Validators.required],
      state: ['', Validators.required], 
      city: ['', Validators.required],  
      accommodation_mode: ['24_horas', Validators.required],
      phone: ['', [this.validatePhoneFormat]], 
      observation: [''],
      foreignCountry: [false],
      noPhone: [false]
    });

    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsUntouched();
      this.registerForm.get(key)?.markAsPristine();
    });
  }

  private setupFormListeners(): void {
    this.registerForm.get('foreignCountry')?.valueChanges.subscribe((isForeign) => {
      this.toggleLocationFields(isForeign);
    });

    this.registerForm.get('noPhone')?.valueChanges.subscribe(checked => {
      const phoneControl = this.registerForm.get('phone');
      if (checked) {
        phoneControl?.clearValidators();
        phoneControl?.disable();
        phoneControl?.setValue('');
      } else {
        phoneControl?.setValidators([this.validatePhoneFormat]); 
        phoneControl?.enable();
      }
      phoneControl?.updateValueAndValidity();
    });
  }

  validatePhoneFormat = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (this.registerForm && this.registerForm.get('noPhone')?.value) {
      return null;
    }

    if (!value) {
      return { required: true }; 
    }

    const cleanedValue = String(value).replace(/\D/g, ''); 

    if (cleanedValue.length < 10 || cleanedValue.length > 11) {
      return { invalidPhoneFormat: true };
    }

    return null;
  };


  formatPhoneNumber(): void {
    const phoneControl = this.registerForm.get('phone');
    if (phoneControl && phoneControl.value !== null) { 
        let value = String(phoneControl.value).replace(/\D/g, ''); 

        if (value.length > 0) {
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); 
            if (value.length > 9) { 
                value = value.replace(/(\d{5})(\d)/, '$1-$2'); 
            } else if (value.length > 8) { 
                value = value.replace(/(\d{4})(\d)/, '$1-$2'); 
            }
        }
        
        if (phoneControl.value !== value) {
            phoneControl.setValue(value, { emitEvent: false });
            phoneControl.updateValueAndValidity(); 
        }
    }
  }


  validateCpf(control: AbstractControl): ValidationErrors | null {
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

  public toggleLocationFields(event: Event | boolean): void {
    const isForeign = typeof event === 'boolean' ? event : (event.target as HTMLInputElement).checked;
    this.isForeign = isForeign;
    this.handleForeignStatus(isForeign);
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

  loadStates(): void {
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
    this.loadCities(stateId);
  }
  
  loadCities(stateId: string): void {
    if (!stateId) {
      this.cidades = [];
      return;
    }
  
    this.locale.getCidadesPorEstado(+stateId).subscribe({
      next: (cidades: Cidade[]) => {
        this.cidades = cidades;
      },
      error: (error: any) => {
        this.cidades = [];
        console.error('Erro ao carregar cidades:', error);
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

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    return null;
  }
  
  async onSubmit(content: TemplateRef<any>): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
  
    const csrfSuccess = await this.getCsrfToken();
    if (!csrfSuccess) {
      this.errorMessage = 'Erro de segurança. Por favor, recarregue a página.';
      this.isLoading = false;
      return;
    }
  
    this.markAllAsTouched();
    if (!this.registerForm.valid) {
      this.errorMessage = this.ERROR_MESSAGES.requiredFields;
      this.isLoading = false;
      return;
    }
  
    const formData = this.prepareFormData();
    if (!formData) {
      this.isLoading = false;
      return;
    }
  
    const csrfToken = this.getCookie('XSRF-TOKEN');
    if (!csrfToken) {
      this.errorMessage = 'Erro de segurança. Recarregue a página.';
      this.isLoading = false;
      return;
    }
  
    try {
      await this.sendAppointmentRequest(formData, csrfToken, content);
    } catch (error: any) {
      if (error.status === 409) {
        this.modalService.open(this.duplicateCpfModal, { centered: true }).result.then(
          async (result) => {
            if (result === 'confirm') {
              this.isLoading = true;
              formData.set('replace', 'true');
              try {
                await this.sendAppointmentRequest(formData, csrfToken, content);
                this.successMessage = 'Agendamento atualizado com sucesso!';
              } catch (e) {
                this.handleApiError(e);
              } finally {
                this.isLoading = false;
              }
            } else {
              this.isLoading = false;
            }
          },
          (reason) => {
            this.isLoading = false;
          }
        );
      } else if (error.status === 422) {
        this.handleValidationErrors(error);
        this.isLoading = false;
      } else {
        this.handleApiError(error);
        this.isLoading = false;
      }
    }
  }

  private prepareFormData(): FormData | null {
    try {
      const isForeign = this.registerForm.get('foreignCountry')?.value === true;
      if (isForeign) {
        this.registerForm.get('state')?.setValue('Estrangeiro');
        this.registerForm.get('city')?.setValue('Não se aplica');
      }
  
      const cpfValue = this.registerForm.get('cpf')?.value.replace(/\D/g, '');
      const noPhoneChecked = this.registerForm.get('noPhone')?.value === true;
      let phoneToSend = '';
      if (!noPhoneChecked) {
        const phoneValue = this.registerForm.get('phone')?.value;
        if (phoneValue) {
          phoneToSend = String(phoneValue).replace(/\D/g, '');
        }
      }
  
      const formattedBirthDate = new Date(this.registerForm.get('birth_date')?.value).toISOString().split('T')[0];
      const formattedArrivalDate = new Date(this.registerForm.get('arrival_date')?.value).toISOString().split('T')[0];
  
      const formData = new FormData();
      const formValues = {
        name: this.registerForm.get('name')?.value,
        last_name: this.registerForm.get('last_name')?.value,
        cpf: cpfValue,
        mother_name: this.registerForm.get('mother_name')?.value,
        gender: this.registerForm.get('gender')?.value,
        birth_date: formattedBirthDate,
        arrival_date: formattedArrivalDate,
        time: this.registerForm.get('time')?.value,
        state: this.registerForm.get('state')?.value,
        city: this.registerForm.get('city')?.value,
        phone: phoneToSend,
        observation: this.registerForm.get('observation')?.value || '',
        accommodation_mode: this.registerForm.get('accommodation_mode')?.value,
        foreign_country: isForeign ? 1 : 0,
        noPhone: noPhoneChecked ? 1 : 0,
        replace: 'false'
      };
  
      Object.entries(formValues).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
  
      if (this.selectedFile) {
        const fileType = this.selectedFile.type;
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(fileType)) {
          formData.append('photo', this.selectedFile, this.selectedFile.name);
        } else {
          this.errorMessage = this.ERROR_MESSAGES.invalidFile;
          throw new Error(this.ERROR_MESSAGES.invalidFile);
        }
      }
      return formData;
    } catch (error) {
      console.error("Erro ao preparar dados do formulário:", error);
      return null;
    }
  }

  private async sendAppointmentRequest(formData: FormData, csrfToken: string, successModalContent: TemplateRef<any>): Promise<any> {
    const response = await this.http.post(
      'http://localhost:8000/api/appointments',
      formData,
      {
        headers: new HttpHeaders({
          'X-XSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }),
        withCredentials: true
      }
    ).toPromise();

    this.handleSuccess(successModalContent);
    return response;
  }
  
  private handleValidationErrors(error: any): void {
    if (error.error?.errors) {
      const errors = error.error.errors;
      
      if (errors.phone) {
          this.errorMessage = "Número de telefone inválido. Por favor, insira um número com 10 ou 11 dígitos (incluindo o DDD).";
      } else if (errors.foreign_country) {
        this.errorMessage = 'Por favor, marque corretamente a opção "País estrangeiro".';
      } else {
        const firstErrorKey = Object.keys(errors)[0];
        this.errorMessage = errors[firstErrorKey][0];
      }
    } else {
      this.errorMessage = 'Dados inválidos. Verifique os campos do formulário.';
    }
  }
  
  private handleSuccess(content: TemplateRef<any>): void {
    this.successMessage = 'Agendamento realizado com sucesso!';
    this.registerForm.reset();
    this.loadAvailableBeds();
    this.openSuccessModal(content);
  }
  
  private handleApiError(error: any): void {
    console.error('Erro na API:', error);
    
    if (error.status === 419) {
      this.errorMessage = 'Sessão expirada. Recarregue a página.';
    } else if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else {
      this.errorMessage = 'Erro ao processar o agendamento. Tente novamente.';
    }
  }

  checkAge(): void {
    const birthDateControl = this.registerForm.get('birth_date');
    if (birthDateControl) {
      const birthDate = new Date(birthDateControl.value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      const isUnderage = age < 18 || 
                        (age === 18 && today < new Date(birthDate.setFullYear(today.getFullYear())));
      
      if (isUnderage) {
        birthDateControl.setErrors({ underage: true });
      } else {
        if (birthDateControl.hasError('underage')) {
          birthDateControl.setErrors(null);
          birthDateControl.updateValueAndValidity();
        }
      }
    }
  }

  private markAllAsTouched(): void {
    Object.values(this.registerForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  private openSuccessModal(content: TemplateRef<any>): void {
    this.modalService.open(content, { centered: true });
  }
}