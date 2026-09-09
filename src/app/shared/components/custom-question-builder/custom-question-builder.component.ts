import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomQuestion, CustomQuestionType } from '../../../core/models/event.model';

@Component({
  selector: 'app-custom-question-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="custom-questions-builder">
      <div class="builder-header flex justify-between items-center">
        <div>
          <h4 class="builder-title">Custom Registration Questions</h4>
          <p class="text-muted text-sm">Ask attendees specific questions during online RSVP or walk-in registration.</p>
        </div>
        <button type="button" (click)="addQuestion()" class="btn btn-sm btn-outline">
          + Add Question
        </button>
      </div>

      <!-- Question List -->
      <div class="questions-list" *ngIf="questions.length > 0; else noQuestions">
        <div *ngFor="let q of questions; let i = index" class="flat-question-card">
          <div class="q-card-header flex justify-between items-center">
            <span class="q-order-badge">#{{ i + 1 }}</span>
            <div class="flex items-center gap-2">
              <label class="toggle-label flex items-center gap-1">
                <input type="checkbox" [(ngModel)]="q.required" (ngModelChange)="onUpdate()" />
                <span class="text-xs font-bold">Required</span>
              </label>

              <button type="button" (click)="moveUp(i)" [disabled]="i === 0" class="btn-icon-sm" title="Move Up">↑</button>
              <button type="button" (click)="moveDown(i)" [disabled]="i === questions.length - 1" class="btn-icon-sm" title="Move Down">↓</button>
              <button type="button" (click)="removeQuestion(i)" class="btn-icon-sm text-coral" title="Delete">✕</button>
            </div>
          </div>

          <div class="q-card-body grid grid-cols-2 gap-3">
            <div class="form-group mb-0">
              <label class="form-label text-xs">Question Prompt <span class="required-star">*</span></label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="q.question" 
                (ngModelChange)="onUpdate()" 
                placeholder="e.g. Dietary Restrictions / T-Shirt Size"
              />
            </div>

            <div class="form-group mb-0">
              <label class="form-label text-xs">Answer Input Type</label>
              <select class="form-control" [(ngModel)]="q.type" (ngModelChange)="onTypeChange(q)">
                <option value="text">Single Line Text</option>
                <option value="number">Numeric Input</option>
                <option value="dropdown">Dropdown Select</option>
                <option value="radio">Radio Options</option>
                <option value="checkbox">Multi-Select Checkboxes</option>
                <option value="yes-no">Yes / No Toggle</option>
              </select>
            </div>
          </div>

          <!-- Options Editor for Dropdown / Radio / Checkbox -->
          <div *ngIf="isOptionBased(q.type)" class="q-options-editor">
            <label class="form-label text-xs">
              Choices (comma-separated):
            </label>
            <input 
              type="text" 
              class="form-control text-xs" 
              [ngModel]="getOptionsString(q)" 
              (ngModelChange)="setOptionsString(q, $event)"
              placeholder="e.g. Option 1, Option 2, Option 3"
            />
            <div class="options-pills-preview" *ngIf="q.options && q.options.length">
              <span *ngFor="let opt of q.options" class="opt-pill">{{ opt }}</span>
            </div>
          </div>
        </div>
      </div>

      <ng-template #noQuestions>
        <div class="no-questions-placeholder">
          <p>No custom questions added yet. Click <strong>+ Add Question</strong> to collect dietary info, track preferences, or shirt sizes.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .custom-questions-builder {
      background: var(--flat-gray-50);
      border: 1.5px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .builder-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .questions-list {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .flat-question-card {
      background: var(--flat-white);
      border: 1.5px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .q-order-badge {
      background: var(--flat-primary);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
    }
    .btn-icon-sm {
      background: var(--flat-gray-100);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-sm);
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-icon-sm:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .q-options-editor {
      background: var(--flat-gray-50);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--flat-border);
    }
    .options-pills-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.4rem;
    }
    .opt-pill {
      background: var(--flat-white);
      border: 1px solid var(--flat-border);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-pill);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--flat-gray-700);
    }
    .no-questions-placeholder {
      text-align: center;
      padding: 1.5rem;
      font-size: 0.875rem;
      color: var(--flat-gray-500);
    }
  `]
})
export class CustomQuestionBuilderComponent implements OnInit {
  @Input() questions: CustomQuestion[] = [];
  @Output() questionsChange = new EventEmitter<CustomQuestion[]>();

  ngOnInit(): void {
    if (!this.questions) {
      this.questions = [];
    }
  }

  addQuestion(): void {
    const newQ: CustomQuestion = {
      id: `temp-cq-${Date.now()}`,
      eventId: '',
      question: '',
      type: 'text',
      required: false,
      order: this.questions.length + 1
    };
    this.questions.push(newQ);
    this.onUpdate();
  }

  removeQuestion(idx: number): void {
    this.questions.splice(idx, 1);
    this.questions.forEach((q, i) => q.order = i + 1);
    this.onUpdate();
  }

  moveUp(idx: number): void {
    if (idx <= 0) return;
    const temp = this.questions[idx];
    this.questions[idx] = this.questions[idx - 1];
    this.questions[idx - 1] = temp;
    this.questions.forEach((q, i) => q.order = i + 1);
    this.onUpdate();
  }

  moveDown(idx: number): void {
    if (idx >= this.questions.length - 1) return;
    const temp = this.questions[idx];
    this.questions[idx] = this.questions[idx + 1];
    this.questions[idx + 1] = temp;
    this.questions.forEach((q, i) => q.order = i + 1);
    this.onUpdate();
  }

  isOptionBased(type: CustomQuestionType): boolean {
    return ['dropdown', 'radio', 'checkbox'].includes(type);
  }

  onTypeChange(q: CustomQuestion): void {
    if (this.isOptionBased(q.type) && (!q.options || q.options.length === 0)) {
      q.options = ['Option A', 'Option B'];
    }
    this.onUpdate();
  }

  getOptionsString(q: CustomQuestion): string {
    return q.options ? q.options.join(', ') : '';
  }

  setOptionsString(q: CustomQuestion, str: string): void {
    q.options = str.split(',').map(s => s.trim()).filter(s => !!s);
    this.onUpdate();
  }

  onUpdate(): void {
    this.questionsChange.emit([...this.questions]);
  }
}
