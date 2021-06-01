import { Component, OnInit, OnDestroy } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';
import { CatalogService } from '../helpers/catalog.service';
import { AuthService } from '../../helpers/auth.service';
import { debounceTime, distinctUntilChanged, filter, first, map, switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CatalogImage } from '../models/image';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import Fuse from 'fuse.js';
import { sortArray } from '../../helpers/utils.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Title } from "@angular/platform-browser";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-images',
  templateUrl: './images.component.html',
  styleUrls: ['./images.component.scss']
})
export class ImagesComponent implements OnInit, OnDestroy
{
  myImages: CatalogImage[] = [];
  myListItems: CatalogImage[] = [];
  images: CatalogImage[] = [];
  listItems: CatalogImage[] = [];
  editorForm: FormGroup;
  loadingIndicator = true;
  myImagesExpanded = true;
  otherImagesExpanded = true;

  private destroy$ = new Subject();
  private readonly fuseJsOptions: {};

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly catalogService: CatalogService,
    private readonly modalService: BsModalService,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder,
    private readonly titleService: Title,
    private readonly translationService: TranslateService)
  {
    translationService.get('catalog.images.title').pipe(first()).subscribe(x => titleService.setTitle(`Spearhead - ${x}`));

    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: true,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 },
        { name: 'description', weight: .8 },
        { name: 'os', weight: .7 },
        { name: 'type', weight: .7 }
      ]
    };

    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        searchTerm: [''],
        sortProperty: ['name']
      });

    this.editorForm.get('searchTerm').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('sortProperty').valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

  }

  // ----------------------------------------------------------------------------------------------------------------
  private applyFiltersAndSort()
  {
    let myListItems: CatalogImage[] = null;
    let listItems: CatalogImage[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      let fuse = new Fuse(this.myImages, this.fuseJsOptions);
      let fuseResults = fuse.search(searchTerm);
      myListItems = fuseResults.map(x => x.item as CatalogImage);

      fuse = new Fuse(this.images, this.fuseJsOptions);
      fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item as CatalogImage);
    }

    if (!myListItems)
      myListItems = [...this.myImages];

    this.myListItems = sortArray(myListItems, this.editorForm.get('sortProperty').value);

    if (!listItems)
      listItems = [...this.images];

    this.listItems = sortArray(listItems, this.editorForm.get('sortProperty').value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  setSortProperty(propertyName: string)
  {
    this.editorForm.get('sortProperty').setValue(propertyName);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearSearch()
  {
    this.editorForm.get('searchTerm').setValue('');
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getCustomImages()
  {
    this.loadingIndicator = true;

    this.authService.userInfoUpdated$
      .pipe(
        takeUntil(this.destroy$),
        filter(userInfo => userInfo != null),
        switchMap(userInfo => this.catalogService.getImages()
          .pipe(map(images => ({ userId: userInfo.id, images })))
        )
      )
      .subscribe(response =>
      {
        this.myImages = [];
        this.images = [];

        for (const image of response.images)
        {
          if (image.owner === response.userId)
            this.myImages.push(image);
          else
            this.images.push(image);
        }

        this.applyFiltersAndSort();

        this.loadingIndicator = false;
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to retrieve the list of custom images ${errorDetails}`);

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteCustomImage(image: CatalogImage)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${image.name}" image?`,
        confirmButtonText: 'Yes, delete this image',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(first()).subscribe(() =>
    {
      this.toastr.info(`Removing image "${image.name}"...`);

      this.catalogService.deleteImage(image.id)
        .subscribe(() =>
        {
          const index = this.myImages.findIndex(i => i.id === image.id);
          if (index >= 0)
            this.myImages.splice(index, 1);

          this.applyFiltersAndSort();

          this.toastr.info(`The image "${image.name}" has been removed`);
        },
          err =>
          {
            this.toastr.error(`Failed to delete the "${image.name}" image ${err.error.message}`);
          });
    });

  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.getCustomImages();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }

}
