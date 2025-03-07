import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { UserRegistrationComponent } from './user-registration.component';
import { By } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

describe('UserRegistrationComponent', () => {
  let component: UserRegistrationComponent;
  let fixture: ComponentFixture<UserRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserRegistrationComponent, ReactiveFormsModule, HttpClientModule], // ✅ Incluído o HttpClientModule
      providers: [AuthService]
    }).compileComponents();
    
    fixture = TestBed.createComponent(UserRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should enable submit button when form is valid', () => {
    // Preenchendo os campos do formulário corretamente
    component.registerForm.controls['name'].setValue('Teste Usuário');
    component.registerForm.controls['username'].setValue('testeuser');
    component.registerForm.controls['password'].setValue('SenhaForte@123');
    component.registerForm.controls['confirmPassword'].setValue('SenhaForte@123');
    component.registerForm.controls['role'].setValue('admin');

    // Atualizar a validade do formulário
    component.registerForm.updateValueAndValidity();
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
    
    // Garantir que o botão está habilitado
    expect(submitButton.nativeElement.disabled).toBeFalse();
  });
});
