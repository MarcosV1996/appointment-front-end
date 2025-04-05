import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../services/auth.service';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

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

  constructor(private http: HttpClient, private authService: AuthService) {
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
      this.viewAllReports();
      setTimeout(() => {
        this.renderCharts();
      }, 500);
    } else {
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

  saveReport(reportType: string) {
    // Usar isLoggedIn() em vez de isAuthenticated()
    if (!this.authService.isLoggedIn()) {
        alert('Você precisa estar logado para salvar relatórios!');
        return;
    }

    const reportData = {
        type: reportType,
        filters: {
            room: this.filters.room,
            gender: this.filters.gender,
            ageGroup: this.filters.ageGroup,
            startDate: this.filters.startDate,
            endDate: this.filters.endDate,
            turn: this.filters.turn
        },
        data: {
            bedCounts: this.bedCounts,
            gender_counts: this.aggregatedData.gender_counts,
            age_counts: this.aggregatedData.age_counts,
            turnoCounts: this.turnoCounts
        }
    };

    this.http.post('http://localhost:8000/api/reports/save', reportData, {
        headers: {
            'Authorization': 'Bearer ' + this.authService.getToken(),
            'Content-Type': 'application/json'
        }
    }).subscribe({
        next: (response: any) => {
            if (response.success) {
                alert('Relatório salvo com sucesso!');
            } else {
                alert('Erro: ' + response.message);
            }
        },
        error: (err) => {
            console.error('Erro ao salvar relatório:', err);
            let errorMessage = 'Erro ao salvar relatório';
            
            if (err.status === 401) {
                errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
                this.authService.logout();
            } else if (err.error?.message) {
                errorMessage += ': ' + err.error.message;
            }
            
            alert(errorMessage);
        }
    });
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
        .filter((key) => key === selectedTurn)
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
    // Destrói gráficos existentes antes de renderizar novos
    this.destroyCharts();
    
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

  // Adiciona método para destruir gráficos existentes
  private destroyCharts() {
    const chartElements = ['roomChart', 'genderChart', 'ageChart', 'turnChart'];
    chartElements.forEach(id => {
      const chartElement = document.getElementById(id) as HTMLCanvasElement;
      if (chartElement) {
        const existingChart = Chart.getChart(chartElement);
        if (existingChart) {
          existingChart.destroy();
        }
      }
    });
  }

  renderRoomChart() {
    const ctx = document.getElementById('roomChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Quarto A', 'Quarto B', 'Quarto C'],
        datasets: [
          {
            data: [this.bedCounts.A, this.bedCounts.B, this.bedCounts.C],
            backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe'],
            borderWidth: 1
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  }

  renderGenderChart() {
    const ctx = document.getElementById('genderChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.aggregatedData.gender_counts.map((item) => this.getTranslatedGender(item.gender)),
        datasets: [
          {
            label: 'Quantidade por Gênero',
            data: this.aggregatedData.gender_counts.map((item) => item.count),
            backgroundColor: [
              '#36a2eb', // Azul para Masculino
              '#ff6384', // Rosa para Feminino
              '#ffce56'  // Amarelo para Outro
            ],
            borderWidth: 1
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
            title: {
              display: true,
              text: 'Quantidade'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Gênero'
            }
          }
        }
      },
    });
  }

  renderAgeChart() {
    const ctx = document.getElementById('ageChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.aggregatedData.age_counts.map((item) => item.group),
        datasets: [
          {
            label: 'Por Faixa Etária',
            data: this.aggregatedData.age_counts.map((item) => item.count),
            backgroundColor: [
              '#4bc0c0', // Turquesa para Idosos
              '#ff9f40', // Laranja para Adultos
              '#9966ff'  // Roxo para outras faixas (se houver)
            ],
            borderWidth: 1
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  }

  renderTurnChart() {
    const ctx = document.getElementById('turnChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.turnoCounts.map((turno) => turno.label),
        datasets: [
          {
            label: 'Distribuição por Turno',
            data: this.turnoCounts.map((turno) => turno.count),
            backgroundColor: [
              '#ff6384', // Manhã
              '#36a2eb', // Tarde
              '#cc65fe', // Noite
              '#ffce56'  // Madrugada
            ],
            borderWidth: 1
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
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
    this.destroyCharts();
  }

  // Adicionado para limpeza quando o componente é destruído
  ngOnDestroy() {
    this.destroyCharts();
  }

  generatePDF() {
    if (!this.authService.isLoggedIn()) {
      alert('Você precisa estar logado para gerar PDFs!');
      return;
    }
  
    try {
      const doc = new jsPDF();
      
      // Configurações iniciais
      doc.setProperties({
        title: 'Relatório de Acolhimentos',
        subject: 'Relatório gerado pelo sistema',
        author: 'Sistema de Acolhimentos',
        keywords: 'relatório, acolhimentos, estatísticas',
        creator: 'Sistema de Acolhimentos'
      });
  
      // Título do relatório
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE ACOLHIMENTOS', 105, 20, { align: 'center' });
      
      // Sub-título
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, 28, { align: 'center' });
  
      // Adiciona logo (opcional)
      // const logo = new Image();
      // logo.src = 'assets/logo.png';
      // doc.addImage(logo, 'PNG', 14, 10, 30, 10);
  
      // Variável para controlar a posição Y
      let startY = 40;
  
      // 1. Dados dos quartos
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. OCUPAÇÃO POR QUARTO', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Quarto', 'Camas Ocupadas']],
        body: [
          ['Quarto A', this.bedCounts.A.toString()],
          ['Quarto B', this.bedCounts.B.toString()],
          ['Quarto C', this.bedCounts.C.toString()],
        ],
        styles: {
          halign: 'center',
          cellPadding: 3,
          fontSize: 10
        },
        headStyles: {
          fillColor: [52, 152, 219], // Azul
          textColor: 255, // Branco
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
  
      // Atualiza a posição Y para a próxima tabela
      startY = (doc as any).lastAutoTable.finalY + 15;
  
      // 2. Dados por gênero
      doc.setFontSize(14);
      doc.text('2. DISTRIBUIÇÃO POR GÊNERO', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Gênero', 'Quantidade']],
        body: this.aggregatedData.gender_counts.map(item => [
          this.getTranslatedGender(item.gender),
          item.count.toString()
        ]),
        styles: {
          halign: 'center',
          cellPadding: 3,
          fontSize: 10
        },
        headStyles: {
          fillColor: [231, 76, 60], // Vermelho
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
  
      // Atualiza a posição Y para a próxima tabela
      startY = (doc as any).lastAutoTable.finalY + 15;
  
      // 3. Dados por faixa etária
      doc.setFontSize(14);
      doc.text('3. DISTRIBUIÇÃO POR FAIXA ETÁRIA', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Faixa Etária', 'Quantidade']],
        body: this.aggregatedData.age_counts.map(item => [
          item.group,
          item.count.toString()
        ]),
        styles: {
          halign: 'center',
          cellPadding: 3,
          fontSize: 10
        },
        headStyles: {
          fillColor: [46, 204, 113], // Verde
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
  
      // Atualiza a posição Y para a próxima tabela
      startY = (doc as any).lastAutoTable.finalY + 15;
  
      // 4. Dados por turno
      doc.setFontSize(14);
      doc.text('4. DISTRIBUIÇÃO POR TURNO', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Turno', 'Quantidade']],
        body: this.turnoCounts.map(item => [
          item.label,
          item.count.toString()
        ]),
        styles: {
          halign: 'center',
          cellPadding: 3,
          fontSize: 10
        },
        headStyles: {
          fillColor: [155, 89, 182], // Roxo
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
  
      // Adiciona número de página
      const addPageNumbers = (doc: jsPDF) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 25,
            doc.internal.pageSize.height - 10
          );
        }
      };
      
      addPageNumbers(doc);
  
      // Gera o PDF e abre em nova aba
      const pdfOutput = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfOutput);
      
      // Abre em nova janela com tratamento para navegadores com bloqueio de pop-up
      const newWindow = window.open();
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        // Fallback para download direto se o pop-up for bloqueado
        doc.save(`relatorio_acolhimentos_${new Date().toISOString().slice(0, 10)}.pdf`);
        alert('O PDF foi baixado automaticamente devido ao bloqueio de pop-ups. Verifique sua pasta de downloads.');
      }
  
      // Libera a memória do objeto URL após 5 segundos
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 5000);
  
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
    }
   }
  }