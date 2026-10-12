import { act, createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { StakeCard } from './StakedCard';
import { stakingFixture } from '../../../../../tests/unit/rpc/staking-fixture';
import { WalletAssetReader } from '_src/shared/rpc/asset-reader';
vi.mock('_src/ui/app/i18n',()=>({useI18n:()=>({t:(key:string)=>key})}));
vi.mock('_src/ui/app/shared/tooltip',()=>({IconTooltip:()=>null}));
vi.mock('_src/ui/app/shared/text',()=>({Text:({children}:{children:ReactNode})=>h('span',null,children)}));
vi.mock('../validators/ValidatorLogo',()=>({ValidatorLogo:()=>null}));
vi.mock('_src/ui/app/shared/countdown-timer',()=>({CountDownTimer:()=>h('span',{'data-testid':'countdown'},'countdown')}));
vi.mock('rtd-apps-core/src/rpc/coin',()=>({useFormatCoin:(amount:unknown)=>[amount===undefined?'--':String(amount),'RTD']}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it.each([0,1,2])('safe mode对第%s种仓位独立显示，不被估算奖励掩盖',async index=>{
  const f=stakingFixture(); f.system.safe_mode=true;
  const reader=await WalletAssetReader.open(f.session,{fetch:f.fetch});
  const view=(await reader.staking(f.owner)).value;
  const position=view.positions![index];
  const node=document.createElement('div'),root=createRoot(node);
  try{
    await act(async()=>root.render(h(MemoryRouter,null,h(StakeCard,{position,view}))));
    expect(node.textContent).toContain('staking.safeMode');
    expect(node.querySelector('[data-testid=countdown]')).toBeNull();
    if(position.reward.state==='estimated' && position.poolState==='active')
      expect(node.textContent).toContain(position.reward.amount);
    if(position.poolState==='inactive')expect(node.textContent).toContain('staking.inactive');
    await act(async()=>root.render(h(MemoryRouter,null,h(StakeCard,{position,view:{...view,safeMode:false}}))));
    expect(node.textContent).not.toContain('staking.safeMode');
  }finally{await act(async()=>root.unmount());f.session.close();}
});
