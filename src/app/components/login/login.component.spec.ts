import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule, ReactiveFormsModule],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with username and password fields', () => {
    const usernameInput = fixture.nativeElement.querySelector('#username');
    const passwordInput = fixture.nativeElement.querySelector('#password');

    expect(usernameInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
  });

  it('should mark username as invalid if empty', () => {
    component.loginForm.controls['username'].setValue('');
    expect(component.loginForm.controls['username'].valid).toBeFalsy();
  });

  it('should mark password as invalid if empty', () => {
    component.loginForm.controls['password'].setValue('');
    expect(component.loginForm.controls['password'].valid).toBeFalsy();
  });

  it('should disable login button if form is invalid', () => {
    component.loginForm.controls['username'].setValue('');
    component.loginForm.controls['password'].setValue('');
    fixture.detectChanges();

    const loginButton = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(loginButton.disabled).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    const initialType = component.passwordVisible;
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBe(!initialType);
  });

  it('should call onLogin when form is submitted', () => {
    spyOn(component, 'onLogin');
    
    component.loginForm.controls['username'].setValue('teste');
    component.loginForm.controls['password'].setValue('123456');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));

    expect(component.onLogin).toHaveBeenCalled();
  });

  it('should display error message on login failure', () => {
    component.loginError = 'Credenciais inválidas';
    fixture.detectChanges();

    const errorMessage = fixture.nativeElement.querySelector('.error-message');
    expect(errorMessage.textContent).toContain('Credenciais inválidas');
  });

  it('should call logout when logout button is clicked', () => {
    spyOn(component, 'logout');
    
    component.isAuthenticated = true;
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('.logout-container button');
    logoutButton.click();

    expect(component.logout).toHaveBeenCalled();
  });
});
