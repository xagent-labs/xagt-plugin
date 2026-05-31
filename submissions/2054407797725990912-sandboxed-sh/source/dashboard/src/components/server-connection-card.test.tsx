import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ServerConnectionCard } from './server-connection-card';
import {
  getComponentsByWorkspace,
  getSystemComponents,
  uninstallSystemComponent,
  updateSystemComponent,
} from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getComponentsByWorkspace: vi.fn(),
  getSystemComponents: vi.fn(),
  uninstallSystemComponent: vi.fn(),
  updateSystemComponent: vi.fn(),
}));

const mockedGetComponentsByWorkspace = vi.mocked(getComponentsByWorkspace);
const mockedGetSystemComponents = vi.mocked(getSystemComponents);
const mockedUninstallSystemComponent = vi.mocked(uninstallSystemComponent);
const mockedUpdateSystemComponent = vi.mocked(updateSystemComponent);

function renderCard() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ServerConnectionCard
        apiUrl="https://agent-backend-dev.thomas.md"
        setApiUrl={vi.fn()}
        urlError={null}
        validateUrl={vi.fn()}
        health={{ version: '1.3.0' }}
        healthLoading={false}
        testingConnection={false}
        testApiConnection={vi.fn()}
      />
    </SWRConfig>
  );
}

describe('ServerConnectionCard', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedGetComponentsByWorkspace.mockReset();
    mockedGetSystemComponents.mockReset();
    mockedUninstallSystemComponent.mockReset();
    mockedUpdateSystemComponent.mockReset();

    mockedGetComponentsByWorkspace.mockResolvedValue({ components: [] });
    mockedGetSystemComponents.mockResolvedValue({
      components: [
        {
          name: 'assistant_mcp',
          version: '0.1.0',
          installed: true,
          update_available: null,
          path: '/usr/local/bin/assistant-mcp',
          status: 'ok',
        },
        {
          name: 'hermes_assistant',
          version: null,
          installed: false,
          update_available: null,
          path: null,
          status: 'not_installed',
        },
      ],
    });
  });

  test('shows Assistant and Hermes components as read-only status rows', async () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Expand components' }));

    expect(await screen.findByText('Assistant MCP')).toBeVisible();
    expect(screen.getByText('Hermes Assistant')).toBeVisible();
    expect(screen.getByText('Not installed on host')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Uninstall Assistant MCP')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockedUpdateSystemComponent).not.toHaveBeenCalled();
      expect(mockedUninstallSystemComponent).not.toHaveBeenCalled();
    });
  });
});
