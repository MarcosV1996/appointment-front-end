import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

// Definição da interface para os dados de faixa etária
interface AgeCount {
  group: string;
  count: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  imports: [CommonModule, FormsModule],
})
export class ReportsComponent {
  isLoading: boolean = false;
  isFilterApplied: boolean = false;
  showCharts: boolean = false; // Controle para exibição de gráficos
  activeFilter: string = ''; // Filtro ativo

  filters = {
    room: '',
    gender: '',
    ageGroup: '',
    startDate: '',
    endDate: '',
    turn: '',
  };

  aggregatedData: {
    gender_counts: any[];
    age_counts: AgeCount[];
  } = {
    gender_counts: [],
    age_counts: [],
  };

  turnoCounts: { label: string; count: number }[] = [];
  bedCounts: { A: number; B: number; C: number } = { A: 0, B: 0, C: 0 };

  constructor(private http: HttpClient) {
    Chart.register(...registerables);
  }

  viewAllReports() {
    console.log('Exibindo todos os relatórios.');

    this.activeFilter = 'all';
    this.isFilterApplied = true;
    this.isLoading = true;

    this.http.get<any>('http://127.0.0.1:8000/api/reports').subscribe({
      next: (response) => {
        console.log('Resposta do servidor:', response);

        // Carrega todos os dados gerais
        this.bedCounts = response.bed_counts || { A: 0, B: 0, C: 0 };
        this.aggregatedData.gender_counts = response.gender_counts || [];
        this.aggregatedData.age_counts = response.age_counts || [];
        this.turnoCounts = this.processTurnoCounts(response.time_data || []);

        this.isLoading = false;

        // Renderiza gráficos, se necessário
        if (this.showCharts) {
          this.renderCharts();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar relatórios:', err);
        this.isLoading = false;
      },
    });
  }

  setActiveFilter(filter: string) {
    this.activeFilter = filter;
    this.isFilterApplied = true;

    this.applyFilters();
  }

  toggleChartView() {
    this.showCharts = !this.showCharts;

    if (this.showCharts) {
      // Simula o clique no botão "Ver Todos"
      this.viewAllReports();

      // Após carregar os dados, renderiza os gráficos
      setTimeout(() => {
        this.renderCharts();
      }, 500); // Adicionei um pequeno delay para garantir que os dados sejam carregados
    } else {
      // Simula o clique no botão "Limpar Tela"
      this.resetFilters();
    }
  }

  getTranslatedGender(gender: string): string {
    const genderMap: { [key: string]: string } = {
      male: 'Masculino',
      female: 'Feminino',
      other: 'Outro'
    };
    return genderMap[gender] || 'Não informado';
  }
  

  applyFilters() {
    console.log('Filtros enviados:', this.filters);

    this.isLoading = true;

    this.http
      .get<any>('http://127.0.0.1:8000/api/reports', {
        params: {
          room: this.filters.room,
          gender: this.filters.gender,
          ageGroup: this.filters.ageGroup,
          startDate: this.filters.startDate,
          endDate: this.filters.endDate,
          turn: this.filters.turn,
        },
      })
      .subscribe({
        next: (response) => {
          console.log('Resposta da API ao aplicar filtros:', response);

          // Atualiza os dados filtrados
          this.bedCounts = response.bed_counts || { A: 0, B: 0, C: 0 };
          this.aggregatedData.gender_counts = response.gender_counts || [];
          this.aggregatedData.age_counts = response.age_counts.filter(
            (item: AgeCount) =>
              item.group === this.getAgeGroupLabel(this.filters.ageGroup)
          );
          this.turnoCounts = this.processTurnoCounts(response.time_data || []);

          // Renderiza os gráficos novamente com os dados filtrados
          this.renderCharts();

          this.isLoading = false;
          console.log('ageCounts atualizados:', this.aggregatedData.age_counts);
          console.log('turnoCounts atualizados:', this.turnoCounts);
        },
        error: (err) => {
          console.error('Erro ao carregar relatórios com filtros:', err);
          this.isLoading = false;
        },
      });
  }

  getAgeGroupLabel(ageGroup: string): string {
    const labels: { [key: string]: string } = {
      idosos: 'Idosos (60+)',
      adultos: 'Adultos (18-59)',
    };
    return labels[ageGroup] || ageGroup;
  }

  processTurnoCounts(timeData: string[]): { label: string; count: number }[] {
    const turnoData = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };

    timeData.forEach((time: string) => {
      const hour = parseInt(time.split(':')[0], 10);
      if (hour >= 6 && hour < 12) {
        turnoData.manha++;
      } else if (hour >= 12 && hour < 18) {
        turnoData.tarde++;
      } else if (hour >= 18 && hour <= 23) {
        turnoData.noite++;
      } else {
        turnoData.madrugada++;
      }
    });

    // Filtra os turnos com base no filtro aplicado (se houver)
    const selectedTurn = this.filters.turn;
    if (selectedTurn) {
      return Object.keys(turnoData)
        .filter((key) => key === selectedTurn) // Apenas o turno selecionado
        .map((key) => ({
          label: this.getTurnLabel(key),
          count: turnoData[key as keyof typeof turnoData],
        }));
    }

    // Caso nenhum turno seja selecionado, retorna todos
    return Object.keys(turnoData).map((key) => ({
      label: this.getTurnLabel(key),
      count: turnoData[key as keyof typeof turnoData],
    }));
  }

  getTurnLabel(turnKey: string): string {
    const labels: { [key: string]: string } = {
      manha: 'Manhã (06:00 - 12:00)',
      tarde: 'Tarde (12:00 - 18:00)',
      noite: 'Noite (18:00 - 23:59)',
      madrugada: 'Madrugada (00:00 - 06:00)',
    };
    return labels[turnKey] || turnKey;
  }

  renderCharts() {
    if (this.showCharts) {
      if (this.bedCounts.A > 0 || this.bedCounts.B > 0 || this.bedCounts.C > 0) {
        this.renderRoomChart();
      }

      if (this.aggregatedData.gender_counts.length > 0) {
        this.renderGenderChart();
      }

      if (this.aggregatedData.age_counts.length > 0) {
        this.renderAgeChart();
      }

      if (this.turnoCounts.length > 0) {
        this.renderTurnChart();
      }
    }
  }

  renderRoomChart() {
    const ctx = document.getElementById('roomChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Quarto A', 'Quarto B', 'Quarto C'],
        datasets: [
          {
            data: [this.bedCounts.A, this.bedCounts.B, this.bedCounts.C],
            backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  renderGenderChart() {
    const ctx = document.getElementById('genderChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.aggregatedData.gender_counts.map((item) => this.getTranslatedGender(item.gender)), // Agora será em português
     datasets: [
          {
            label: 'Por Gênero',
            data: this.aggregatedData.gender_counts.map((item) => item.count),
            backgroundColor: '#42a5f5',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  renderAgeChart() {
    const ctx = document.getElementById('ageChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.aggregatedData.age_counts.map((item) => item.group),
        datasets: [
          {
            label: 'Por Faixa Etária',
            data: this.aggregatedData.age_counts.map((item) => item.count),
            backgroundColor: ['#ff9f40', '#4bc0c0'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  renderTurnChart() {
    const ctx = document.getElementById('turnChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.turnoCounts.map((turno) => turno.label),
        datasets: [
          {
            label: 'Turnos',
            data: this.turnoCounts.map((turno) => turno.count),
            backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  resetFilters() {
    this.filters = {
      room: '',
      gender: '',
      ageGroup: '',
      startDate: '',
      endDate: '',
      turn: '',
    };
    this.activeFilter = '';
    this.isFilterApplied = false;
    this.showCharts = false;
  }
}
