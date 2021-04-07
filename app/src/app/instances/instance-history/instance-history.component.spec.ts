import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceHistoryComponent } from './instance-history.component';

describe('InstanceHistoryComponent', () => {
  let component: InstanceHistoryComponent;
  let fixture: ComponentFixture<InstanceHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceHistoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
