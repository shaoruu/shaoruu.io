import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { BlockUpdate, Coords3 } from '@voxelize/core';

import topStarredRepos from '../assets/data/topStars.json';
import { useVoxelize } from '../hooks/useVoxelize';
import type { ChatItem } from '../types';

const chatMargin = '16px';
const chatVanishTime = 5000;

let removeTimeout: NodeJS.Timeout;

export function Chat() {
  const {
    chat,
    inputs,
    rigidControls,
    world,
    network,
    method,
    voxelInteract,
    entities,
  } = useVoxelize();

  const chatListDomRef = useRef<HTMLUListElement>(null);
  const chatInputDomRef = useRef<HTMLInputElement>(null);

  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  const hideInput = () => {
    if (!chatInputDomRef.current) return;

    chatInputDomRef.current!.value = '';
    chatInputDomRef.current!.style.visibility = 'hidden';
    chatInputDomRef.current?.blur();
  };

  const showChatList = () => {
    clearTimeout(removeTimeout);
    chatListDomRef.current?.classList.remove('remove');
  };

  const hideChatList = () => {
    clearTimeout(removeTimeout);

    removeTimeout = setTimeout(() => {
      chatListDomRef.current?.classList.add('remove');
    }, chatVanishTime);
  };

  const openChatInput = useCallback(
    (isCommand = false) => {
      inputs?.setNamespace('chat');
      chatInputDomRef.current!.style.visibility = 'visible';
      chatInputDomRef.current?.focus();
      clearTimeout(removeTimeout);
      rigidControls?.unlock();

      setTimeout(() => {
        if (chatInputDomRef.current)
          chatInputDomRef.current.value =
            isCommand && chat ? chat.commandSymbol : '';
      }, 10);
    },
    [chat, inputs, rigidControls],
  );

  useLayoutEffect(() => {
    if (
      !chat ||
      !inputs ||
      !rigidControls ||
      !world ||
      !method ||
      !entities ||
      !voxelInteract
    ) {
      return;
    }

    chat.addCommand('kill-all-bots', () => {
      method.call('kill-all-bots');
    });

    chat.addCommand('tp', (rest) => {
      const [x, y, z] = rest.split(' ').map((n) => parseInt(n));
      rigidControls.teleport(x, y, z);
    });

    chat.addCommand('all-blocks', () => {
      const allBlocks = Array.from(world.registry.blocksById.values()).slice(1);
      const perRow = 10;

      const updates: BlockUpdate[] = [];
      const [vx, vy, vz] = rigidControls.voxel;

      for (let i = 0; i < allBlocks.length; i++) {
        const block = allBlocks[i];
        const x = i % perRow;
        const y = 0;
        const z = Math.floor(i / perRow);

        updates.push({ vx: vx + x, vy: vy + y, vz: vz + z, type: block.id });
      }

      world.updateVoxels(updates);
    });

    const placeTextAt = (text: string, coords: Coords3) => {
      const [x, y, z] = coords;

      entities.map.forEach((entity, id) => {
        // Check if any entity is already at this position
        if (
          entity.position.x === x &&
          entity.position.y === y &&
          entity.position.z === z
        ) {
          method.call('remove-floating-text', { id });
          return;
        }
      });

      method.call('add-floating-text', {
        text,
        position: [x, y, z],
      });
    };

    chat.addCommand('trophies', () => {
      const trophyLocations = [
        [-11.5, 37.5, 3.5],
        [-11.5, 37.5, -2.5],
        [-13.5, 37.5, 3.5],
        [-13.5, 37.5, -2.5],
        [-15.5, 37.5, 3.5],
        [-15.5, 37.5, -2.5],
      ];

      for (let i = 0; i < trophyLocations.length; i++) {
        const trophy = topStarredRepos[i];
        const [x, y, z] = trophyLocations[i];
        let metainfo = '';

        switch (trophy.name) {
          case 'mc.js':
            metainfo = "\n$#7D7C7C$DMCA'd by Mojang";
            break;
        }

        console.log(metainfo);

        placeTextAt(
          `$gold$${trophy.name}\n$white$⭐${trophy.stars} stars⭐${metainfo}`,
          [x, y, z],
        );
      }
    });

    chat.addCommand('text', (rest) => {
      const text = rest.trim();
      const { target } = voxelInteract;

      if (!target) {
        console.warn('no target, cannot add text');
        return;
      }

      let [x, y, z] = target;

      x += 0.5;
      y += 1.5;
      z += 0.5;

      placeTextAt(text, [x, y, z]);
    });

    chat.onChat = (chat: ChatItem) => {
      setChatItems((prev) => [...prev, chat]);
      showChatList();

      if (inputs.namespace !== 'chat') {
        hideChatList();
      }
    };

    rigidControls.on('lock', () => {
      if (inputs.namespace !== 'in-game') {
        inputs.setNamespace('in-game');
      }

      hideChatList();
      hideInput();
    });

    rigidControls.on('unlock', () => {
      if (
        chatInputDomRef.current?.style.visibility === 'hidden' &&
        inputs.namespace === 'in-game'
      ) {
        inputs.setNamespace('menu');
      }
    });

    inputs.bind(
      't',
      () => {
        rigidControls.unlock();
        openChatInput();
      },
      'in-game',
    );

    inputs.bind(
      chat.commandSymbol,
      () => {
        openChatInput(true);
        chatInputDomRef.current!.focus();
      },
      'in-game',
    );

    return () => {
      inputs.unbind('t');
      inputs.unbind(chat.commandSymbol);

      chat.removeCommand('tp');
      chat.removeCommand('test');
      chat.removeCommand('all-blocks');
      chat.removeCommand('text');
      chat.removeCommand('trophies');
    };
  }, [
    chat,
    entities,
    inputs,
    method,
    openChatInput,
    rigidControls,
    voxelInteract,
    world,
  ]);

  useEffect(() => {
    chatListDomRef.current?.children[
      chatListDomRef.current?.children.length - 1
    ]?.scrollIntoView();
  }, [chatItems]);

  return (
    <div
      className="absolute bottom-px left-1/2 transform translate-x-[-50%] flex flex-col w-[60vw] gap-2 z-[1000000]"
      style={{
        width: 'calc(100% - ${chatMargin} * 2)',
        margin: chatMargin,
      }}
    >
      <ul
        className="list-none overflow-auto w-full rounded max-h-[200px] flex flex-col bg-overlay"
        ref={chatListDomRef}
      >
        {chatItems.map((chatItem, index) => (
          <div
            key={chatItem.body + index}
            className="flex items-center gap-1 text-background-primary px-3 py-2 text-xs"
          >
            {chatItem.sender && (
              <p className="text-text-tertiary">{chatItem.sender}: </p>
            )}
            <p>{chatItem.body}</p>
          </div>
        ))}
      </ul>
      <input
        ref={chatInputDomRef}
        className="border-none bg-overlay rounded outline-none px-3 py-2 text-background-primary text-xs"
        style={{ visibility: 'hidden' }}
        onKeyUp={(e) => {
          if (e.key === 'Escape') {
            hideInput();
            rigidControls?.lock();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.nativeEvent.isComposing === false) {
            if (e.currentTarget.value === '') return;

            chat?.send({
              type: 'chat',
              sender: network?.clientInfo.username,
              body: e.currentTarget.value,
            });
            e.currentTarget.value = '';

            hideInput();
            rigidControls?.lock();
          }
        }}
      />
    </div>
  );
}
