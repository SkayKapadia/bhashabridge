<!-- domains: game-dev -->
Root Causes

1. The Saved Model Was Never Properly Trained
   In the previous code, optimize() was placed outside the loop and only executed once per episode instead of on every step.
   As seen in

runs/flappybirdv0.log
, the best score in 18,000 episodes was only 16.89 (barely 1 pipe from lucky random exploration).
When you run python agent.py flappybirdv0, it loads that undertrained checkpoint.
2. The LiDAR vs. 12-Feature Mismatch
Notice how

dqn.py
defines:

python
def __init__(self, state_dim=12, action_dim=2, hidden_dim=256):
The architecture was designed for 12 features (use_lidar=False).

Currently (use_lidar=True, default): The environment provides 180 distance rays without bird velocity. A small 2-layer MLP struggles to know whether the bird is falling fast or rising, making learning very difficult and slow.
With use_lidar=False: The environment provides exactly 12 kinematic features (horizontal pipe distance, top/bottom pipe gap coordinates, bird height, and vertical velocity). A standard DQN learns to pass pipes easily in just 300–500 episodes.
3. network_sync_rate is Too Frequent
In

parameters.yaml:L11
, network_sync_rate: 10 copies target network weights every 10 steps. In Deep Q-Learning, updating the target network this fast creates an unstable "moving target". Standard DQN sync rates are typically between 500 and 1,000 steps.

How to Fix & Train a Winning Model
Step 1: Set use_lidar=False in agent.py
In

agent.py:L72
, change:

python
env = gym.make("FlappyBird-v0", render_mode="human" if render else None, use_lidar=False)
(This feeds the 12 clean features directly into DQN(state_dim=12)).

Step 2: Adjust parameters.yaml for Stability
In

parameters.yaml
:

yaml
network_sync_rate: 1000
learning_rate_a: 0.0003

Increase network_sync_rate to 500 or 1000 (provides stable Q-value targets).
Set learning_rate (alpha) to 0.0003 (standard for Adam in DQN).
Step 3: Run Training
Delete the old undertrained checkpoint and train fresh:

bash
python agent.py flappybirdv0 --train
With the 12 features and per-step optimization in place, the bird will quickly learn to dodge pipes and achieve high scores.

Would you like me to update agent.py and parameters.yaml with these improvements?
