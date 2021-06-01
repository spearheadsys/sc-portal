import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AffinityRuleEditorComponent } from './affinity-rule-editor.component';

describe('AffinityRuleEditorComponent', () => {
  let component: AffinityRuleEditorComponent;
  let fixture: ComponentFixture<AffinityRuleEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AffinityRuleEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AffinityRuleEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
