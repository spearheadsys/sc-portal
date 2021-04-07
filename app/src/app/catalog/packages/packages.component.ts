import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { OnDestroy } from '@angular/core/core';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { CatalogService } from '../helpers/catalog.service';
import { CatalogImage } from '../../catalog/models/image';

@Component({
  selector: 'app-packages',
  templateUrl: './packages.component.html',
  styleUrls: ['./packages.component.scss']
})
export class PackagesComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  imageType: number;

  @Input()
  image: CatalogImage;

  @Input()
  package: string;

  @Output()
  select = new EventEmitter();

  packageGroups: any[];
  loadingIndicator: boolean;
  selectedPackageGroup: string;

  private packages: {};
  private _selectedPackage: {};
  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly catalogService: CatalogService,
    private readonly fileSizePipe: FileSizePipe)
  {
    this.getPackages();
  }

  // ----------------------------------------------------------------------------------------------------------------
  setPackageGroup(event, packageGroup: string)
  {
    this.selectedPackageGroup = packageGroup;

    if (!packageGroup) return;

    switch (packageGroup)
    {
      case 'cpu':
        this.packages[packageGroup].sort((a, b) => (a.vcpus || 1) - (b.vcpus || 1));
        break;

      case 'disk':
        this.packages[packageGroup].sort((a, b) => a.disk - b.disk);
        break;

      case 'memory optimized':
        this.packages[packageGroup].sort((a, b) => a.memory - b.memory);
        break;

      default:
        this.packages[packageGroup].sort((a, b) => ((a.vcpus || 1) - (b.vcpus || 1)) || (a.memory - b.memory) || (a.disk - b.disk));
        break;
    }
  }

  // ----------------------------------------------------------------------------------------------------------------
  set selectedPackage(value)
  {
    this._selectedPackage = value;

    this.select.next(value);
  }
  get selectedPackage()
  {
    return this._selectedPackage;
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getPackages()
  {
    this.loadingIndicator = true;

    this.catalogService.getPackages()
      .subscribe(response =>
      {
        if (this.packages)
          return;

        this.packages = response.reduce((groups, pkg) =>
        {
          let size = this.fileSizePipe.transform(pkg.memory * 1024 * 1024);
          [pkg.memorySize, pkg.memorySizeLabel] = size.split(' ');

          size = this.fileSizePipe.transform(pkg.disk * 1024 * 1024);
          [pkg.diskSize, pkg.diskSizeLabel] = size.split(' ');

          const groupName = pkg.group.toLowerCase() || 'standard';

          const group = (groups[groupName] || []);
          group.push(pkg);
          groups[groupName] = group;

          return groups;
        }, {});

        this.setPackageGroups();
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private setPackageGroups()
  {
    if (!this.packages || !this.image || !this.imageType)
      return;

    // Setup the operating systems array-like object, sorted alphabetically
    this.packageGroups = Object.keys(this.packages)
      .filter(x =>
      {
        this.packages[x].forEach(p =>
        {
          if (p.name === this.package)
            this._selectedPackage = p;

          if (!p.brand || !this.image)
          {
            p.visible = true;
            return;
          }

          if (this.image.requirements.brand)
            p.visible = this.image.requirements.brand === p.brand;

          if (this.image.type === 'zone-dataset')
            p.visible = ['joyent', 'joyent-minimal'].includes(p.brand);

          if (this.image.type === 'lx-dataset')
            p.visible = p.brand === 'lx';

          if (this.image.type === 'zvol')
            p.visible = ['bhyve', 'kvm'].includes(p.brand);
        });

        switch (this.imageType | 0)
        {
          case 1:
            return this.packages[x].length && (!x || ['cpu', 'disk', 'memory optimized', 'standard', 'triton'].includes(x));

          case 2:
            return this.packages[x].length && (!x || ['standard', 'triton'].includes(x));

          default:
            return false;
        }
      })
      .sort((a, b) => a.localeCompare(b));

    // Set the pre-selected package group
    this.selectedPackageGroup = this.packageGroups[0];

    if (this.selectedPackage)
      this.select.emit(this.selectedPackage);

    this.loadingIndicator = false;
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    this.onChanges$.pipe(takeUntil(this.destroy$))
      .subscribe((changes: SimpleChanges) =>
      {
        if (changes.image?.currentValue && changes.imageType?.currentValue)
          this.setPackageGroups();
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    // Since we can't control if ngOnChanges is executed before ngOnInit, we need this trick
    this.onChanges$.next(changes);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy(): void
  {
    this.destroy$.next();
  }
}
