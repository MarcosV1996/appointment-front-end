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
  cidades: Cidade[] = [];
  availableBeds: number = 0; // Total de vagas disponíveis
  minArrivalDate: string = '';
  maxArrivalDate: string = '';
  rulesContent: TemplateRef<any> | null = null; // Template para modal de regras

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
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.setDateConstraints();
    this.initializeForm();
    this.loadStates();
    this.loadAvailableBeds();
    this.setupFormListeners();
    
  }

  // Inicializa o formulário
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
      state: [''],
      city: [''],
      phone: [''],
      observation: [''],
      foreignCountry: [{ value: '', disabled: false }],
      noPhone: [false],
    });
  }

  // Define as restrições de data mínima e máxima
  private setDateConstraints(): void {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 14);

    this.minArrivalDate = this.datePipe.transform(today, 'yyyy-MM-dd')!;
    this.maxArrivalDate = this.datePipe.transform(maxDate, 'yyyy-MM-dd')!;
  }

  // Carrega as vagas disponíveis
  loadAvailableBeds(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.http.get<{ availableBeds: number }>('http://127.0.0.1:8000/api/appointments/available-beds', {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (response) => {
          console.log('Vagas disponíveis recebidas:', response.availableBeds);
          this.availableBeds = response.availableBeds; // Atualiza as vagas disponíveis no formulário
        },
        error: (error) => {
          console.error('Erro ao buscar vagas disponíveis no formulário:', error);
          this.availableBeds = 0; // Exibe 0 caso ocorra algum erro
        },
      });
    } else {
      console.error('Token de autenticação não encontrado.');
    }
  }
  
  // Configura listeners do formulário
  private setupFormListeners(): void {
    this.registerForm.get('foreignCountry')?.valueChanges.subscribe((isForeign) => {
      this.toggleLocationFields(isForeign);
    });

    this.registerForm.get('noPhone')?.valueChanges.subscribe((noPhone) => {
      this.togglePhoneField(noPhone);
    });
  }

  private toggleLocationFields(isForeign: boolean): void {
    const stateControl = this.registerForm.get('state');
    const cityControl = this.registerForm.get('city');
    if (isForeign) {
      stateControl?.clearValidators();
      cityControl?.clearValidators();
      stateControl?.disable();
      cityControl?.disable();
    } else {
      stateControl?.setValidators(Validators.required);
      cityControl?.setValidators(Validators.required);
      stateControl?.enable();
      cityControl?.enable();
    }
    stateControl?.updateValueAndValidity();
    cityControl?.updateValueAndValidity();
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

  // Exibe o modal de regras
  openRulesModal(content: TemplateRef<any>): void {
    if (content) {
      this.modalService.open(content, { centered: true });
    }
  }

  // Formata o nome para capitalizar a primeira letra de cada palavra
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

  // CPF Validation
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
      return null; // Se não há valor, não há validação
    }
  
    const birthDate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
  
    // Ajusta o cálculo se o aniversário ainda não ocorreu no ano atual
    const isUnderage =
      age < 18 || (age === 18 && today < new Date(birthDate.setFullYear(today.getFullYear())));
  
    return isUnderage ? { underage: true } : null;
  }
  
  loadStates(): void {
    this.locale.getEstados().subscribe({
      next: (states: Estado[]) => (this.states = states),
      error: (error) => console.error('Erro ao buscar estados:', error),
    });
  }   
   
  onStateChange(event: any): void {
    const stateId = event.target.value;

    if (stateId) {
        this.locale.getCidadesPorEstado(+stateId).subscribe({
            next: (cidades: Cidade[]) => {
                this.cidades = cidades;
            },
            error: (error) => {
                console.error('Erro ao buscar cidades:', error);
                this.cidades = [];
            },
        });
    } else {
        this.cidades = [];
    }
}

onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input?.files?.length) {
    this.selectedFile = input.files[0];
    this.invalidFile = false; // Reseta erro de arquivo
  }
}

onSubmit(content: TemplateRef<any>): void {
  if (this.registerForm.valid) {
    if (this.invalidFile) {
      this.errorMessage = this.ERROR_MESSAGES.invalidFile;
      return;
    }
    // Remove caracteres indesejados do CPF
    const cpfValue = this.registerForm.get('cpf')?.value.replace(/\D/g, '');
    this.registerForm.patchValue({ cpf: cpfValue });

    // Remove telefone se "Não tenho telefone" estiver marcado
    if (this.registerForm.get('noPhone')?.value) {
      this.registerForm.patchValue({ phone: null });
    }

    // Formatar as datas
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
    formData.append('state', this.getStateName(this.registerForm.get('state')?.value));
    formData.append('city', this.getCityName(this.registerForm.get('city')?.value));
    formData.append('phone', this.registerForm.get('phone')?.value || '');
    formData.append('observation', this.registerForm.get('observation')?.value || '');

    // Adiciona a foto apenas se for selecionada
    if (this.selectedFile) {
      const fileType = this.selectedFile.type;
      if (fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/jpg') {
        formData.append('photo', this.selectedFile, this.selectedFile.name);
      } else {
        this.errorMessage = 'O arquivo selecionado deve ser uma imagem (JPEG, PNG).';
        return;
      }
    }

    // Envia os dados para o backend
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
            // Tratamento para CPF duplicado
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
  formData.append('mother_name', this.registerForm.get('mother_name')?.value || ''); // Valor padrão
  formData.append('gender', this.registerForm.get('gender')?.value);
  formData.append('birth_date', this.registerForm.get('birth_date')?.value); // Data formatada
  formData.append('arrival_date', this.registerForm.get('arrival_date')?.value); // Data formatada
  formData.append('time', this.registerForm.get('time')?.value);
  formData.append('state', this.getStateName(this.registerForm.get('state')?.value));
  formData.append('city', this.getCityName(this.registerForm.get('city')?.value));
  formData.append('phone', this.registerForm.get('phone')?.value || ''); // Valor padrão
  formData.append('observation', this.registerForm.get('observation')?.value || ''); // Valor padrão

  if (this.selectedFile) {
    formData.append('photo', this.selectedFile, this.selectedFile.name);
  }

  return formData;
}

/**
 * Envia os dados para a API.
 */
private submitToApi(formData: FormData, content: TemplateRef<any>, token: string): void {
  this.http.post('http://127.0.0.1:8000/api/appointments', formData, {
    headers: { Authorization: `Bearer ${token}` },
  }).subscribe({
    next: () => {
      this.successMessage = this.ERROR_MESSAGES.registrationSuccess;
      this.registerForm.reset();
      this.loadAvailableBeds(); // Atualiza as vagas disponíveis no formulário
      this.openSuccessModal(content); // Exibe o modal de sucesso
    },
    error: (error) => {
      console.error('Erro ao enviar dados:', error);
      this.errorMessage = this.ERROR_MESSAGES.registrationError;
    }
  });
}

/**
 * Lida com a validação do formulário e exibe mensagens de erro.
 */
private handleInvalidForm(): void {
  this.markInvalidFields(); // Marca os campos inválidos
  this.errorMessage = this.ERROR_MESSAGES.requiredFields;
}

  // Marca os campos inválidos no formulário
private markInvalidFields(): void {
    Object.keys(this.registerForm.controls).forEach((field) => {
      const control = this.registerForm.get(field);
      if (control && control.invalid) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  // Retorna o nome completo do estado com base no ID
  private getStateName(stateId: string): string {
    const state = this.states.find(s => s.id.toString() === stateId);
    return state ? state.nome : '';
  }

  // Retorna o nome completo da cidade com base no ID
  private getCityName(cityId: string): string {
    const city = this.cidades.find(c => c.id.toString() === cityId);
    return city ? city.nome : '';
  }

  // Exibe o modal de sucesso
  private openSuccessModal(content: TemplateRef<any>): void {
    this.modalService.open(content, { centered: true });
  }
}
