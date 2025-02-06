import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; 
import { NationalityService } from './nationality.service';

describe('NationalityService', () => {
  let service: NationalityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], 
      providers: [NationalityService]
    });
    service = TestBed.inject(NationalityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
