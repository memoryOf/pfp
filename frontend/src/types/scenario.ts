// Scenario related type definitions

export interface Scenario {
  id: number;
  name: string;
  description?: string;
  scenario_type: 'locust' | 'jmeter' | 'gatling';
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ScenarioCreate {
  name: string;
  description?: string;
  scenario_type: 'locust' | 'jmeter' | 'gatling';
}

export interface ScenarioUpdate {
  name?: string;
  description?: string;
  scenario_type?: 'locust' | 'jmeter' | 'gatling';
  is_active?: boolean;
}

