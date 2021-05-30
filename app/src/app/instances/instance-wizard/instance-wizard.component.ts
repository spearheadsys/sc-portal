import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { combineLatest, forkJoin, Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray, ValidatorFn, ValidationErrors } from '@angular/forms';
import { Instance } from '../models/instance';
import { filter, takeUntil, startWith, distinctUntilChanged } from 'rxjs/operators';
import { NavigationStart, Router } from '@angular/router';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { InstancesService } from '../helpers/instances.service';
import { CatalogService } from '../../catalog/helpers/catalog.service';
import { NetworkingService } from '../../networking/helpers/networking.service';
import { ToastrService } from 'ngx-toastr';
import { VolumesService } from '../../volumes/helpers/volumes.service';
import { AuthService } from '../../helpers/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { CatalogImageType } from '../../catalog/models/image';

@Component({
  selector: 'app-instance-wizard',
  templateUrl: './instance-wizard.component.html',
  styleUrls: ['./instance-wizard.component.scss']
})
export class InstanceWizardComponent implements OnInit, OnDestroy
{
  @Input()
  add: boolean;

  @Input()
  imageType = 1;

  @Input()
  instance: Instance;

  private images: any[];
  imageList: any[];
  operatingSystems: any[];

  private packages: {};
  packageList: any[];
  packageGroups: any[];

  instances: Instance[];
  dataCenters: any[];

  loadingIndicator: boolean;
  loadingPackages: boolean;
  save = new Subject<Instance>();
  working: boolean;
  editorForm: FormGroup;
  currentStep = 1;
  steps: any[];
  preselectedPackage: string;
  kvmRequired: boolean;
  estimatedCost: number;
  readyText: string;

  private destroy$ = new Subject();
  private userId: string;

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly fileSizePipe: FileSizePipe,
    private readonly authService: AuthService,
    private readonly instancesService: InstancesService,
    private readonly catalogService: CatalogService,
    private readonly networkingService: NetworkingService,
    private readonly volumesService: VolumesService,
    private readonly toastr: ToastrService,
    private readonly translateService: TranslateService)
  {
    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());

    this.steps = [
      {
        id: 1,
        title: 'Image',
        description: 'The image used to provision this machine'
      },
      {
        id: 2,
        title: 'Package',
        description: "This machine's technical specifications"
      },
      {
        id: 3,
        title: 'Settings',
        description: 'Name your machine, configure networks and setup volumes'
      },
      {
        id: 4,
        title: 'Create',
        description: 'Tag and create your machine'
      }
    ];

    authService.userInfoUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(x => this.userId = x.id);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    const tags = this.fb.array(this.instance
      ? Object.keys(this.instance.tags)
        .map(key => this.fb.group({ key, value: this.instance.tags[key] }))
      : []);

    const metadata = this.fb.array(this.instance
      ? Object.keys(this.instance.metadata)
        .filter(key => key !== 'root_authorized_keys') // This shouldn't be cloned
        .map(key => this.fb.group({ key, value: this.instance.metadata[key] }))
      : []);

    this.editorForm = this.fb.group(
      {
        imageType: [this.imageType],
        imageOs: [],
        image: [null, Validators.required],
        package: [null, Validators.required],
        name: [null, Validators.required],
        networks: this.fb.array([], { validators: this.atLeastOneSelectionValidator.bind(this) }),
        firewallRules: this.fb.array([]),
        cloudFirewall: [this.instance?.firewall_enabled],
        volumes: this.fb.array([]),
        affinity: this.fb.group(
          {
            strict: [{ value: false, disabled: true }],
            closeTo: [],
            farFrom: []
          }),
        dataCenter: [],
        tags,
        metadata,
        estimatedMinutesRan: [24]
      });

    this.configureForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private configureForm()
  {
    this.editorForm.get('name').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(name =>
      {
        this.steps[2].selection = { name };
        this.steps[2].complete = this.editorForm.get('name').valid && this.editorForm.get('networks').valid;
      });

    this.editorForm.get('networks').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() =>
      {
        this.steps[2].complete = this.editorForm.get('name').valid && this.editorForm.get('networks').valid;
      });

    this.editorForm.get('imageType').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value =>
      {
        const imageType = value | 0;
        const imageList = [];
        const operatingSystems = {};

        if (imageType === CatalogImageType.InfrastructureContainer)
        {
          for (const image of this.images)
            if (['lx-dataset', 'zone-dataset'].includes(image.type) && image.owner !== this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }
        else if (imageType === CatalogImageType.VirtualMachine)
        {
          for (const image of this.images)
            if (['zvol'].includes(image.type) && image.owner !== this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }
        else if (imageType === CatalogImageType.Custom)
        {
          for (const image of this.images)
            if (image.owner === this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }

        this.operatingSystems = Object.keys(operatingSystems);

        this.imageList = imageList.filter(x => x.os === this.operatingSystems[0]).sort((a, b) => a.name.localeCompare(b.name));

        // Set the pre-selected operating system
        this.editorForm.get('imageOs').setValue(this.operatingSystems[0]);

        // Invalidate previous selections
        this.steps[0].selection = null;
        this.steps[0].complete = true;

        this.editorForm.get('image').setValue(null);
      });

    this.editorForm.get('imageOs').valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(imageOs =>
      {
        const imageType = this.editorForm.get('imageType').value | 0;
        const imageList = [];
        const operatingSystems = {};

        if (imageType === CatalogImageType.InfrastructureContainer)
        {
          for (const image of this.images)
            if (['lx-dataset', 'zone-dataset'].includes(image.type) && (!imageOs || imageOs === image.os) && image.owner !== this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }
        else if (imageType === CatalogImageType.VirtualMachine)
        {
          for (const image of this.images)
            if (['zvol'].includes(image.type) && (!imageOs || imageOs === image.os) && image.owner !== this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }
        else if (imageType === CatalogImageType.Custom)
        {
          for (const image of this.images)
            if (image.owner === this.userId)
            {
              operatingSystems[image.os] = true;
              imageList.push(image);
            }
        }

        this.imageList = imageList.sort((a, b) => a.name.localeCompare(b.name));
      });

    this.editorForm.get('image').valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(x =>
      {
        this.steps[0].selection = x;
        this.steps[0].complete = !!x;

        this.kvmRequired = x?.requirements['brand'] === 'kvm' || x?.type === 'zvol' || false;

        this.loadingPackages = true;

        this.computeEstimatedCost();
      });

    this.editorForm.get('package').valueChanges
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(x =>
      {
        this.steps[1].selection = x;
        this.steps[1].complete = !!x;

        this.kvmRequired = this.editorForm.get('image').value?.requirements['brand'] === 'kvm' ||
          this.editorForm.get('image').value?.type === 'zvol' ||
          x?.brand === 'kvm' || false;

          this.computeEstimatedCost();
        });

    this.editorForm.get(['affinity', 'farFrom']).valueChanges.pipe(startWith(null))
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.setAffinity.bind(this));

    this.editorForm.get(['affinity', 'closeTo']).valueChanges.pipe(startWith(null))
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.setAffinity.bind(this));

    this.editorForm.get('estimatedMinutesRan').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.computeEstimatedCost.bind(this));
  }

  // ----------------------------------------------------------------------------------------------------------------
  private computeEstimatedCost()
  {
    const estimatedMinutesRan = this.editorForm.get('estimatedMinutesRan').value || 1;
    const imagePrice = this.editorForm.get('image').value?.price || 0;
    const packagePrice = this.editorForm.get('package').value?.price || 0;

    this.estimatedCost = imagePrice + packagePrice * estimatedMinutesRan;
}

  // ----------------------------------------------------------------------------------------------------------------
  private atLeastOneSelectionValidator: ValidatorFn = (array: FormArray): ValidationErrors | null =>
  {
    let selected = 0;

    Object.keys(array.controls).forEach(key =>
    {
      const control = array.controls[key];

      if (control.value.selected)
        selected++;
    });

    if (selected < 1)
    {
      return { atLeastOneSelection: true }
    }

    return null;
  }

  // ----------------------------------------------------------------------------------------------------------------
  private setAffinity(affinity)
  {
    if (affinity)
      this.editorForm.get(['affinity', 'strict']).enable();
    else
      this.editorForm.get(['affinity', 'strict']).disable();
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const changes = this.editorForm.getRawValue();

    const instance: any = {};
    instance.name = changes.name;
    instance.image = changes.image.id;
    instance.package = changes.package.id;
    //instance.brand = changes.package.brand;
    instance.networks = changes.networks.filter(x => x.selected).map(x => x.id);
    instance.firewall_enabled = !!changes.cloudFirewall;

    for (const tag of changes.tags)
      instance[`tag.${tag.key}`] = tag.value;

    for (const metadata of changes.metadata)
      instance[`metadata.${metadata.key}`] = metadata.value;

    if (!this.kvmRequired)
      instance.volumes = changes.volumes
        .filter(x => x.mount)
        .map(volume =>
        ({
          name: volume.name,
          type: 'tritonnfs',
          mode: volume.ro ? 'ro' : 'rw',
          mountpoint: volume.mountpoint
        }));

    this.instancesService.add(instance)
      .subscribe(x =>
      {
        this.working = false;

        const imageDetails = this.images.find(i => i.id === x.image);
        if (imageDetails)
          x.imageDetails = imageDetails[0];

        this.save.next(x);
        this.modalRef.hide();
      }, err =>
      {
        this.toastr.error(err.error.message);
        this.working = false;
      });

  }

  // ----------------------------------------------------------------------------------------------------------------
  previousStep()
  {
    this.currentStep = this.currentStep > 1 ? this.currentStep - 1 : 1;
  }

  // ----------------------------------------------------------------------------------------------------------------
  nextStep()
  {
    this.currentStep = this.currentStep < this.steps.length ? this.currentStep + 1 : this.steps.length;

    if (this.currentStep < this.steps.length) return;

    this.readyText = this.translateService.instant('dashboard.wizard.ready', {
      imageType: this.editorForm.get('imageType').value == 1 
                  ? this.translateService.instant('dashboard.wizard.readyImageTypeContainer') 
                  : this.translateService.instant('dashboard.wizard.readyImageTypeVm'),
      packageDescription: this.editorForm.get('package').value.description || 
                          `<b>${this.editorForm.get('package').value.vcpus || 1}</b> vCPUs, ` +
                          `<b>${this.fileSizePipe.transform(this.editorForm.get('package').value.memory * 1024 * 1024)}</b> RAM, ` +
                          `<b>${this.fileSizePipe.transform(this.editorForm.get('package').value.disk * 1024 * 1024)}</b> storage`,
      machineName: this.editorForm.get('name').value,
      imageDescription: this.editorForm.get('image').value.description
    })
  }

  // ----------------------------------------------------------------------------------------------------------------
  setPackage(selection: any)
  {
    this.steps[1].selection = selection;
    this.steps[1].complete = true;

    this.editorForm.get('package').setValue(selection);

    if (this.instance)
      this.nextStep();
  }

  // ----------------------------------------------------------------------------------------------------------------
  addTag(event)
  {
    const array = this.editorForm.get('tags') as FormArray;

    array.push(this.fb.group({
      key: event.key,
      value: event.value
    }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeTag(index)
  {
    const array = this.editorForm.get('tags') as FormArray;

    array.removeAt(index);
  }

  // ----------------------------------------------------------------------------------------------------------------
  addMetadata(event)
  {
    const array = this.editorForm.get('metadata') as FormArray;

    array.push(this.fb.group({
      key: event.key,
      value: event.value
    }));
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeMetadata(index)
  {
    const array = this.editorForm.get('metadata') as FormArray;

    array.removeAt(index);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getImages()
  {
    this.loadingIndicator = true;

    this.catalogService.getImages()
      .subscribe(response =>
      {
        this.images = response;

        // Set the default image type (this will trigger a series of events)
        this.editorForm.get('imageType').setValue(this.imageType);

        if (this.instance)
        {
          const image = this.images.find(x => x.id === this.instance.image);
          this.editorForm.get('image').setValue(image);
        }

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getNetworksAndFirewallRules()
  {
    const networks = this.editorForm.get('networks') as FormArray;
    //  const firewallRules = this.editorForm.get('firewallRules') as FormArray;

    if (networks.length)
      return;

    forkJoin(
      [
        this.networkingService.getNetworks(),
        //this.networkingService.getFirewallRules()
      ]
    ).subscribe(response =>
    {
      for (const network of response[0])
        networks.push(this.fb.group({
          id: [network.id],
          name: [network.name],
          description: [network.description],
          public: [network.public],
          selected: [false]
        }));

      //  for (const firewallRule of response[1])
      //    firewallRules.push(this.fb.group({
      //      id: [firewallRule.id],
      //      name: [firewallRule.name],
      //      description: [firewallRule.description],
      //      selected: [false]
      //    }));
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getInstancesAndDataCenters()
  {
    if (this.instances || this.dataCenters)
      return;

    forkJoin(
      this.instancesService.get(),
      this.catalogService.getDataCenters()
    )
      .subscribe(response =>
      {
        this.instances = response[0];

        this.dataCenters = Object.keys(response[1]);

        this.editorForm.get('dataCenter').setValue(this.dataCenters[0]);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getVolumes()
  {
    this.volumesService.getVolumes()
      .subscribe(volumes =>
      {
        const array = this.editorForm.get('volumes') as FormArray;

        for (const volume of volumes)
        {
          const control = this.fb.group(
            {
              mount: [false],
              name: [{ value: volume.name, disabled: true }, Validators.required],
              ro: [{ value: false, disabled: true }],
              mountpoint: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(2)]]
            });

          control.get('mount').valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(mount =>
            {
              if (mount)
              {
                control.get('ro').enable();
                control.get('mountpoint').enable();
              }
              else
              {
                control.get('ro').disable();
                control.get('mountpoint').disable();
              }
            });

          array.push(control);
        }
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    if (this.imageType < 1 || this.imageType > 4)
      throw 'Invalid image type';

    this.createForm();

    this.getNetworksAndFirewallRules();

    this.getInstancesAndDataCenters();

    this.getVolumes();

    if (this.instance)
    {
      if (this.instance.type === 'smartmachine')
        this.imageType = 1;
      else if (this.instance.type === 'virtualmachine')
        this.imageType = 2;

      this.preselectedPackage = this.instance.package;

      this.nextStep();
    }

    if (this.imageType <= 2)
      this.getImages();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy(): void
  {
    this.destroy$.next();
  }
}
