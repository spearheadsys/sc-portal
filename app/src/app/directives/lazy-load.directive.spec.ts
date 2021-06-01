import { LazyLoadDirective } from './lazy-load.directive';

describe('LazyLoadDirective', () => {
  it('should create an machine', () => {
    const directive = new LazyLoadDirective();
    expect(directive).toBeTruthy();
  });
});
