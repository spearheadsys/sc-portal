import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceInfoComponent } from './instance-info.component';

describe('InstanceInfoComponent', () => {
  let component: InstanceInfoComponent;
  let fixture: ComponentFixture<InstanceInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
