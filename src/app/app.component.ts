/* import { User } from './../../../appointment-backend/vendor/laravel/breeze/stubs/inertia-react-ts/resources/js/types/index.d';
 */
import { UserRegistrationComponent } from './components/user-registration/user-registration.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgxMaskDirective } from 'ngx-mask';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { FilterComponent } from './components/filter/filter.component';
import { AboutComponent } from './components/about/about.component';
import { ContactsComponent } from './components/contacts/contacts.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { FooterComponent } from './components/footer/footer.component';
import { JobsComponent } from './components/jobs/jobs.component';
import { FormComponent } from './components/form/form.component';
import { PartnershipsComponent } from './components/partnerships/partnerships.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AppointmentsListComponent } from './components/appointments-list/appointments-list.component';
import { AuthGuard } from './components/guard-routes-appointaments-list/auth.guard';
import { EditListComponent } from './components/edit-list/edit-list.component';
import {  HttpHeaders } from '@angular/common/http';
import { RefreshComponent } from './components/refresh/refresh.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ManageUsersComponent } from './components/manage-users/manage-users.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
   
    ReactiveFormsModule,
    CommonModule,
    ReportsComponent,
    HttpClientModule,
    NgxMaskDirective,
    RouterModule,
    RouterOutlet,
    HomeComponent,
    FilterComponent,
    AboutComponent,
    ContactsComponent,
    NavBarComponent,
    FooterComponent,
    JobsComponent,
    FormComponent,
    RefreshComponent,
    PartnershipsComponent,
    ManageUsersComponent,
   
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {}

const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'about', component: AboutComponent, canActivate: [AuthGuard] },
  { path: 'contacts', component: ContactsComponent, canActivate: [AuthGuard] },
  { path: 'jobs', component: JobsComponent, canActivate: [AuthGuard] },
  { path: 'form', component: FormComponent, canActivate: [AuthGuard] },
  { path: 'partnerships', component: PartnershipsComponent, canActivate: [AuthGuard] },
  { path: 'filter', component: FilterComponent, canActivate: [AuthGuard] },
  { path: 'appointments-list', component: AppointmentsListComponent, canActivate: [AuthGuard] },
  { path: 'edit/:id', component: EditListComponent, canActivate: [AuthGuard] },
  { path: 'user-registration', component: UserRegistrationComponent, canActivate: [AuthGuard] },
  { path: 'refresg', component: RefreshComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'manage-user', component: ManageUsersComponent },

];

export const AppRoutingModule = RouterModule.forRoot(appRoutes);
