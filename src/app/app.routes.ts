import { EditUserComponent } from './components/edit-user/edit-user.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ReportsComponent } from './components/reports/reports.component';
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { FormComponent } from './components/form/form.component';
import { ContactsComponent } from './components/contacts/contacts.component';
import { AboutComponent } from './components/about/about.component';
import { JobsComponent } from './components/jobs/jobs.component';
import { PartnershipsComponent } from './components/partnerships/partnerships.component';
import { FilterComponent } from './components/filter/filter.component';
import { AppointmentsListComponent } from './components/appointments-list/appointments-list.component'; 
import { AuthGuard } from './components/guard-routes-appointaments-list/auth.guard';
import { EditListComponent } from './components/edit-list/edit-list.component';
import { UserRegistrationComponent } from './components/user-registration/user-registration.component';
import { RefreshComponent } from './components/refresh/refresh.component';
import { ManageUsersComponent } from './components/manage-users/manage-users.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component'; 

export const routes: Routes = [
  // Rotas públicas
  { path: 'home', component: HomeComponent },
  { path: 'appointments', component: FormComponent },
  { path: 'contacts', component: ContactsComponent },
  { path: 'about', component: AboutComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'partnerships', component: PartnershipsComponent },
  { path: 'filter', component: FilterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Rotas protegidas para admin/employee
  { 
    path: 'appointments-list', 
    component: AppointmentsListComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin', 'employee'] }
  },
  { 
    path: 'edit/:id', 
    component: EditListComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin', 'employee'] }
  },
  { 
    path: 'reports', 
    component: ReportsComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin'] } 
  },

  // Rotas exclusivas para admin
  { 
    path: 'user-registration', 
    component: UserRegistrationComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin'] }
  },
  { 
    path: 'manage-users', 
    component: ManageUsersComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin'] } 
  },
  { 
    path: 'edit-user/:id', 
    component: EditUserComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin'] } 
  },
  { 
    path: 'edit-list/:id', 
    component: EditListComponent, 
    canActivate: [AuthGuard],
    data: { expectedRoles: ['admin', 'employee'] }
  },
  
  // Rotas auxiliares
  { path: 'refresh', component: RefreshComponent, canActivate: [AuthGuard] },
  
  // Redirecionamentos
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
  { path: 'api/login', redirectTo: '/login' },
];