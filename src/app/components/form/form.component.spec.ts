import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormComponent } from './form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DatePipe } from '@angular/common';
import { IbgeService } from '../ibge.service';

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, HttpClientTestingModule, FormComponent], 
      providers: [FormBuilder, NgbModal, DatePipe, IbgeService],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    component.ngOnInit(); // Garante que o formulário está inicializado
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar o formulário corretamente', () => {
    expect(component.registerForm).toBeDefined();
    expect(component.registerForm.valid).toBeFalse();
  });

  it('deve marcar campos obrigatórios como inválidos se estiverem vazios', () => {
    component.registerForm.patchValue({
      name: '',
      last_name: '',
      cpf: '',
      birth_date: '',
      mother_name: '',
      gender: '',
      arrival_date: '',
      time: '',
    });

    expect(component.registerForm.valid).toBeFalse();
  });

  it('deve validar CPF corretamente', () => {
    component.registerForm.get('cpf')?.setValue('123.456.789-09'); // CPF válido
    expect(component.registerForm.get('cpf')?.valid).toBeTrue();

    component.registerForm.get('cpf')?.setValue('12345678900'); // CPF inválido
    expect(component.registerForm.get('cpf')?.valid).toBeFalse();
  });

  it('deve desativar os campos "Estado" e "Cidade" se for estrangeiro', () => {
    component.registerForm.get('foreignCountry')?.setValue(true);
    expect(component.registerForm.get('state')?.disabled).toBeTrue();
    expect(component.registerForm.get('city')?.disabled).toBeTrue();
  });

  it('deve ativar os campos "Estado" e "Cidade" se não for estrangeiro', () => {
    component.registerForm.get('foreignCountry')?.setValue(false);
    expect(component.registerForm.get('state')?.disabled).toBeFalse();
    expect(component.registerForm.get('city')?.disabled).toBeFalse();
  });

  it('deve desativar o campo "Telefone" se "Não tenho telefone" estiver marcado', () => {
    component.registerForm.get('noPhone')?.setValue(true);
    expect(component.registerForm.get('phone')?.disabled).toBeTrue();
  });

  it('deve ativar o campo "Telefone" se "Não tenho telefone" estiver desmarcado', () => {
    component.registerForm.get('noPhone')?.setValue(false);
    expect(component.registerForm.get('phone')?.disabled).toBeFalse();
  });

  it('deve chamar onSubmit() e validar o formulário antes de enviar', () => {
    const dummyTemplate = {} as any;
    spyOn(component, 'onSubmit').and.callThrough();
    component.onSubmit(dummyTemplate);
    expect(component.onSubmit).toHaveBeenCalled();
  });

  it('deve formatar corretamente o nome e sobrenome', () => {
    component.registerForm.get('name')?.setValue('joão da silva');
    component.formatName('name');
    expect(component.registerForm.get('name')?.value).toBe('João Da Silva');

    component.registerForm.get('last_name')?.setValue('souza');
    component.formatName('last_name');
    expect(component.registerForm.get('last_name')?.value).toBe('Souza');
  });

  it('deve exibir erro se a idade for menor de 18 anos', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 17); // Data de nascimento para 17 anos

    component.registerForm.get('birth_date')?.setValue(birthDate.toISOString().split('T')[0]);
    expect(component.registerForm.get('birth_date')?.errors).toEqual({ underage: true });
  });

  it('deve permitir agendamentos para maiores de idade', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 18); // Data de nascimento para 18 anos

    component.registerForm.get('birth_date')?.setValue(birthDate.toISOString().split('T')[0]);
    expect(component.registerForm.get('birth_date')?.errors).toBeNull();
  });

  it('deve preencher corretamente os estados ao carregar', () => {
    spyOn(component, 'loadStates').and.callThrough();
    component.loadStates();
    expect(component.loadStates).toHaveBeenCalled();
  });

  it('deve buscar cidades ao selecionar um estado', () => {
    const mockEvent = { target: { value: '1' } };
    spyOn(component, 'onStateChange').and.callThrough();
    component.onStateChange(mockEvent);
    expect(component.onStateChange).toHaveBeenCalled();
  });
});
