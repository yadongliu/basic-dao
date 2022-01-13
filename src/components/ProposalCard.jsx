import {useState, useEffect} from 'react';
import { ethers } from "ethers";
import { ProposalState } from "@3rdweb/sdk";

export default function ProposalCard(props) {
    const { proposal, address, voteModule, tokenModule} = props;
    const [voteType, setVoteType] = useState(2); // default vote.type is "abstain", i.e. 2
    const [isVoting, setIsVoting] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    
    useEffect(() => {
        // we can't check if the user voted yet if proposal is null!
        if (!proposal) {
          return;
        }
      
        // Check if the user has already voted on the proposal.
        voteModule
          .hasVoted(proposal.proposalId, address)
          .then((hasVoted) => {
            setHasVoted(hasVoted);
            if (hasVoted) {
              console.log("🥵 User has already voted")
            }
          })
          .catch((err) => {
            console.error("failed to check if wallet has voted", err);
          });
    }, [proposal, address]);

    function handleChange(event) {
        const {name, value} = event.target
        setVoteType(value);
    }

    function handleSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const voteResult = {
            proposalId: proposal.proposalId,
            vote: voteType,
        };
        console.log("Submitting: ", voteResult);

        submitVotes([voteResult]);
    }

    const submitVotes = async (votes) => {
        // first we need to make sure the user delegates their token to vote
        try {
          //we'll check if the wallet still needs to delegate their tokens before they can vote
          const delegation = await tokenModule.getDelegationOf(address);
          // if the delegation is the 0x0 address that means they have not delegated their governance tokens yet
          if (delegation === ethers.constants.AddressZero) {
            //if they haven't delegated their tokens yet, we'll have them delegate them before voting
            await tokenModule.delegateTo(address);
          }
          // then we need to vote on the proposals
          try {
            await Promise.all(
              votes.map(async (vote) => {
                // before voting we first need to check whether the proposal is open for voting
                // we first need to get the latest state of the proposal
                const proposal = await voteModule.get(vote.proposalId);
                // then we check if the proposal is open for voting (state === 1 means it is open)
                if (proposal.state === 1) {
                  // if it is open for voting, we'll vote on it
                  return voteModule.vote(vote.proposalId, vote.vote);
                }
                // if the proposal is not open for voting we just return nothing, letting us continue
                return;
              })
            );
            try {
              // if any of the propsals are ready to be executed we'll need to execute them
              // a proposal is ready to be executed if it is in state 4
              await Promise.all(
                votes.map(async (vote) => {
                  // we'll first get the latest state of the proposal again, since we may have just voted before
                  const proposal = await voteModule.get(
                    vote.proposalId
                  );
    
                  //if the state is in state 4 (meaning that it is ready to be executed), we'll execute the proposal
                  if (proposal.state === 4) {
                    return voteModule.execute(vote.proposalId);
                  }
                })
              );
              // if we get here that means we successfully voted, so let's set the "hasVoted" state to true
              setHasVoted(true);
              // and log out a success message
              console.log("successfully voted");
            } catch (err) {
              console.error("failed to execute votes", err);
            }
          } catch (err) {
            console.error("failed to vote", err);
          }
        } catch (err) {
          console.error("failed to delegate tokens");
        } finally {
          // in *either* case we need to set the isVoting state to false to enable the button again
          setIsVoting(false);
        }
      };
    
    const stateLabel = proposal.state === ProposalState.Active ? "In progress"
        : proposal.state === ProposalState.Defeated ? "Defeated"
        : proposal.state === ProposalState.Succeeded ? "Succeeded" 
        : proposal.state === ProposalState.Expired ? "Expired"
        : proposal.state === ProposalState.Executed ? "Executed"
        : "Other"
        ; 
    const stateStyle = proposal.state === ProposalState.Executed ? "proposal-state propstate-executed"
        : proposal.state === ProposalState.Succeeded ? "proposal-state propstate-succeeded"
        : "proposal-state propstate-other";
    return (
        <div> 
            <form onSubmit={async (e) => { handleSubmit(e)}}>
                <div key={proposal.proposalId} className="card">
                    <span className={stateStyle}> {stateLabel} </span>
                    <h5>{proposal.description}</h5>
                    <div>
                    {proposal.votes.map((vote) => (
                        <div key={vote.type}>
                            <input
                                type="radio"
                                id={proposal.proposalId + "-" + vote.type}
                                name={proposal.proposalId}
                                value={vote.type}
                                checked={vote.type == voteType}
                                onChange={handleChange}
                            />
                            <label htmlFor={proposal.proposalId + "-" + vote.type}>
                                {vote.label}
                            </label>
                        </div>
                    ))}
                    </div>
                    { hasVoted ? <p className="voted-text">You Already Voted</p> : 
                        <button disabled={isVoting || hasVoted} type="submit">
                            {isVoting ? "Voting..." : "Submit Votes"}
                    </button>
                    }
                </div>
            </form>
        </div>
    );
}