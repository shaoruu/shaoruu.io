import { AIVoxelizer } from '../components/AIVoxelizer';
import { Crosshair } from '../components/Crosshair';
import { Inventory } from '../components/Inventory';
import { IV } from '../components/IV';
import { Tooltip } from '../components/Tooltip';
import { currentWorldName } from '../constants';

import { Chat } from '@/src/containers/Chat';
import { LinkBlocks } from '@/src/containers/LinkBlocks';
import { VoxelizeProvider } from '@/src/containers/Providers/Voxelize';

export function App() {
  return (
    <VoxelizeProvider worldName={currentWorldName} canvasId="main">
      <canvas id="main" />
      <Crosshair />
      <Chat />
      <IV />
      <Tooltip />
      <Inventory />
      <AIVoxelizer />
      <LinkBlocks />
      {/* <Menu /> */}
    </VoxelizeProvider>
  );
}
