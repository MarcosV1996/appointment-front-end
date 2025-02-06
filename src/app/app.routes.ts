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
import { AppointmentsListComponent} from './components/appointments-list/appointments-list.component'; 
import { AuthGuard } from './components/guard-routes-appointaments-list/auth.guard';
import { EditListComponent } from './components/edit-list/edit-list.component';
import { UserRegistrationComponent } from './components/user-registration/user-registration.component';
import { RefreshComponent } from './components/refresh/refresh.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'appointments', component: FormComponent },
  { path: 'contacts', component: ContactsComponent },
  { path: 'about', component: AboutComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'partnerships', component: PartnershipsComponent },
  { path: 'filter', component: FilterComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'appointments-list', component: AppointmentsListComponent, canActivate: [AuthGuard] },
  { path: 'edit/:id', component: EditListComponent, canActivate: [AuthGuard] },
  { path: 'user-registration', component: UserRegistrationComponent, canActivate: [AuthGuard] },
  { path: 'refresg', component: RefreshComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] }

];
