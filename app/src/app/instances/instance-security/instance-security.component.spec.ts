import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceSecurityComponent } from './instance-security.component';

describe('InstanceSecurityComponent', () => {
  let component: InstanceSecurityComponent;
  let fixture: ComponentFixture<InstanceSecurityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceSecurityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
