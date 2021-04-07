import { TestBed } from '@angular/core/testing';

import { InstancesService } from './instances.service';

describe('InstancesService', () => {
  let service: InstancesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstancesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
