import { describe, expect, it } from 'vitest';
import { convertCase, convertCaseAll } from '../src/tools/text/case-service';

describe('Case service', () => {
  it('把常见变量名拆分并转换为目标格式', () => {
    expect(convertCase('user profile URL value', 'camel')).toBe('userProfileUrlValue');
    expect(convertCase('userProfileURLValue', 'snake')).toBe('user_profile_url_value');
    expect(convertCase('user_profile_url_value', 'pascal')).toBe('UserProfileUrlValue');
    expect(convertCase('User Profile URL Value', 'kebab')).toBe('user-profile-url-value');
    expect(convertCase('user-profile-url-value', 'constant')).toBe('USER_PROFILE_URL_VALUE');
    expect(convertCase('userProfileURLValue', 'dot')).toBe('user.profile.url.value');
  });

  it('可以一次输出全部格式', () => {
    expect(convertCaseAll('order id')).toEqual({
      camel: 'orderId',
      pascal: 'OrderId',
      snake: 'order_id',
      kebab: 'order-id',
      constant: 'ORDER_ID',
      title: 'Order Id',
      dot: 'order.id',
    });
  });

  it('空白输入返回空字符串', () => {
    expect(convertCase('   ', 'camel')).toBe('');
  });
});
