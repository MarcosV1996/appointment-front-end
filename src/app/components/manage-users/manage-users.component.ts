import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.css'],
})

export class ManageUsersComponent implements OnInit {
  users: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.http.get<any[]>('/api/users').subscribe(
      (data) => {
        this.users = data;
      },
      (error) => console.error('Erro ao buscar usuários:', error)
    );
  }
  
  editUser(user: any) {
    this.router.navigate(['/edit-user', user.id]);
  }

  deleteUser(userId: number) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      this.http.delete(`/api/users/${userId}`).subscribe(
        () => {
          this.users = this.users.filter((user) => user.id !== userId);
          alert('Usuário excluído com sucesso!');
        },
        (error) => console.error('Erro ao excluir usuário:', error)
      );
    }
  }
}
